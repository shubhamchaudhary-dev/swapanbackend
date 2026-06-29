import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Paper from '../models/Paper';
import CMSConfig from '../models/CMSConfig';
import User from '../models/User';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { cacheGet, cacheSet, cacheDelPattern } from '../utils/redis';
import { hasUserViewedPaper, markUserViewedPaper } from '../utils/redis';
import { uploadPDF, uploadBase64 } from '../utils/cloudinary';
import { createUniqueSlug } from '../utils/slugify';
import mongoose from 'mongoose';

const router = Router();

const paperSchema = z.object({
  title: z.string().min(5).max(300),
  abstract: z.string().min(20),
  authors: z.union([z.string().min(1), z.array(z.string()).min(1)]),
  subjectId: z.string().min(1),
});

// GET /api/papers
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, q, page = '1', limit = '12' } = req.query as Record<string, string>;
    const cacheKey = `papers:${JSON.stringify({ subject, q, page, limit })}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = { status: 'published' };
    if (subject) query.subject = subject;
    if (q) query.$text = { $search: q };

    const [papers, total] = await Promise.all([
      Paper.find(query)
        .populate('subject', 'name slug')
        .populate('createdBy', 'name institution')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Paper.countDocuments(query),
    ]);

    const response = {
      success: true,
      data: papers,
      pagination: { page: pageNum, limit: limitNum, total },
    };

    await cacheSet(cacheKey, JSON.stringify(response), 120);
    res.json(response);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

let lastReqBody: any = null;

// GET /api/papers/debug
router.get('/debug', (req, res) => {
  res.json({ lastReqBody });
});

// POST /api/papers
router.post(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = paperSchema.parse(req.body);
      
      const pdfUrl = req.body.pdfUrl;
      if (!pdfUrl) {
        res.status(400).json({ success: false, message: 'PDF file is required' });
        return;
      }

      // In JSON payload, authors comes in as an array of strings directly, but paperSchema expects a string?
      // Wait, paperSchema was parsing it as string, but if frontend sends JSON, it's sending an array!
      // If frontend sends an array, Zod will fail!
      // Let's manually get authors from req.body and not use data.authors if it fails.
      
      const authors = Array.isArray(req.body.authors) ? req.body.authors : [];
      if (authors.length === 0) {
          res.status(400).json({ success: false, message: 'Authors are required' });
          return;
      }

      const slug = createUniqueSlug(data.title);

      const paper = await Paper.create({
        title: data.title,
        abstract: data.abstract,
        pdfUrl,
        authors,
        subject: data.subjectId,
        status: 'submitted',
        createdBy: req.user!._id,
        slug,
        ...(req.body.coverLetterUrl   && { coverLetterUrl:   req.body.coverLetterUrl }),
        ...(req.body.coverLetterName  && { coverLetterName:  req.body.coverLetterName }),
        ...(req.body.reviewers && Array.isArray(req.body.reviewers) && { reviewers: req.body.reviewers }),
        ...(req.body.keywords && Array.isArray(req.body.keywords) && { keywords: req.body.keywords }),
        ...(req.body.highlights && { highlights: req.body.highlights }),
      });

      await cacheDelPattern('papers:*');
      res.status(201).json({ success: true, data: paper });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, message: err.errors[0].message });
        return;
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/papers/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const papers = await Paper.find({ createdBy: req.user!._id })
      .populate('subject', 'name slug')
      .sort({ createdAt: -1 })
      .lean();
      
    // Attach hasPayment flag for receipt download logic
    const papersWithPayment = await Promise.all(papers.map(async (p) => {
        const payment = await mongoose.model('Payment').findOne({ paperId: p._id, status: 'success' });
        return { ...p, hasPayment: !!payment };
    }));

    res.json({ success: true, data: papersWithPayment });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/papers/:slug
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findOne({ slug: req.params.slug, status: 'published' })
      .populate('subject', 'name slug')
      .populate('createdBy', 'name institution');

    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }

    // View debounce
    if (req.user) {
      const viewed = await hasUserViewedPaper(req.user._id.toString(), paper._id.toString());
      if (!viewed) {
        await Paper.findByIdAndUpdate(paper._id, { $inc: { views: 1 } });
        await markUserViewedPaper(req.user._id.toString(), paper._id.toString());
        paper.views += 1;
      }
    }

    // Related papers
    const related = await Paper.find({
      subject: paper.subject,
      status: 'published',
      _id: { $ne: paper._id },
    })
      .populate('subject', 'name slug')
      .limit(3)
      .lean();

    // Check Membership Locking
    let isLocked = false;
    const cmsConfig = await CMSConfig.findOne({ key: 'homepage' });
    const globalLock = cmsConfig?.value?.requireMembershipForAllPapers || false;
    const paperLock = paper.requiresMembership || false;
    
    if (globalLock || paperLock) {
      if (!req.user) {
        isLocked = true;
      } else {
        const userDoc = await User.findById(req.user._id);
        if (!userDoc?.hasMembership) {
          isLocked = true;
        } else if (userDoc.membershipExpiresAt && userDoc.membershipExpiresAt < new Date()) {
          isLocked = true;
          // Auto-revoke expired membership
          userDoc.hasMembership = false;
          await userDoc.save();
        }
      }
    }

    res.json({ success: true, data: { paper, related, isLocked } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/papers/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }

    const isOwner = paper.createdBy.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (paper.status === 'published' && !isAdmin) {
      res.status(400).json({ success: false, message: 'Published papers cannot be edited' });
      return;
    }

    const allowed = ['title', 'abstract', 'authors', 'subject'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'authors' && typeof req.body[key] === 'string') {
          (paper as unknown as Record<string, unknown>)[key] = req.body[key].split(',').map((a: string) => a.trim()).filter(Boolean);
        } else {
          (paper as unknown as Record<string, unknown>)[key] = req.body[key];
        }
      }
    }

    await paper.save();
    await cacheDelPattern('papers:*');
    res.json({ success: true, data: paper });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', authenticate, requireRole('admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findByIdAndDelete((_req as AuthRequest).params.id);
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }
    await cacheDelPattern('papers:*');
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/papers/:id/publish
router.post('/:id/publish', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }
    await cacheDelPattern('papers:*');
    res.json({ success: true, data: paper });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/papers/:id/download
router.post('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }
    res.json({ success: true, data: { pdfUrl: paper.pdfUrl } });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/papers/:id/request-correction
router.post('/:id/request-correction', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }

    if (paper.createdBy.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (paper.status !== 'pre_proof') {
      res.status(400).json({ success: false, message: 'Paper is not in pre-proof stage' });
      return;
    }

    if (paper.correctionRequestCount && paper.correctionRequestCount >= 1) {
      res.status(400).json({ success: false, message: 'Correction request limit reached' });
      return;
    }

    const { correctionNotes, correctionFileBase64, correctionFileName } = req.body;
    if (!correctionNotes && !correctionFileBase64) {
      res.status(400).json({ success: false, message: 'Please provide correction notes or upload a corrected file' });
      return;
    }

    let fileUrl: string | undefined = undefined;
    if (correctionFileBase64) {
      try {
        fileUrl = await uploadBase64(correctionFileBase64, 'swarnpublication/corrections', 'raw');
      } catch (cloudErr: any) {
        console.error('[Author Correction Upload] Cloudinary error:', cloudErr);
        res.status(500).json({ success: false, message: `File upload failed: ${cloudErr?.message || 'Cloudinary error'}` });
        return;
      }
    }

    paper.status = 'correction_requested';
    paper.correctionRequested = true;
    paper.correctionRequestCount = (paper.correctionRequestCount || 0) + 1;
    if (correctionNotes) paper.authorCorrectionNotes = correctionNotes;
    if (fileUrl) paper.authorCorrectionFileUrl = fileUrl;
    
    await paper.save();

    await cacheDelPattern('papers:*');
    res.json({ success: true, data: paper });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/papers/:id/approve-proof
router.post('/:id/approve-proof', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }

    if (paper.createdBy.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (paper.status !== 'pre_proof') {
      res.status(400).json({ success: false, message: 'Paper is not in pre-proof stage' });
      return;
    }

    const config = await CMSConfig.findOne({ key: 'global_config' });
    const requirePayment = config?.value?.enablePublicationPayment || false;

    paper.proofApproved = true;
    paper.proofApprovedAt = new Date();
    paper.paymentRequired = requirePayment;
    
    if (requirePayment) {
      paper.status = 'payment_pending';
    } else {
      paper.status = 'published';
      paper.publishedAt = new Date();
    }

    await paper.save();
    await cacheDelPattern('papers:*');
    res.json({ success: true, data: paper });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/papers/:id/submit-correction
router.post('/:id/submit-correction', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }
    if (paper.createdBy.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (paper.status !== 'correction_requested') {
      res.status(400).json({ success: false, message: 'Paper is not in correction requested stage' });
      return;
    }
    const { correctionFileBase64 } = req.body;
    if (!correctionFileBase64) {
      res.status(400).json({ success: false, message: 'Please upload a corrected file' });
      return;
    }
    
    let fileUrl = await uploadBase64(correctionFileBase64, 'swarnpublication/papers', 'raw');

    // Override the pdfUrl and put back under review
    paper.pdfUrl = fileUrl;
    paper.status = 'under_review';
    paper.correctionRequested = false;
    
    await paper.save();
    await cacheDelPattern('papers:*');
    res.json({ success: true, message: 'Correction submitted successfully', data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
