import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Subject from '../models/Subject';
import Paper from '../models/Paper';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';
import { createSlug } from '../utils/slugify';

const router = Router();

const subjectSchema = z.object({
  name: z.string().min(2).max(100),
  shortDescription: z.string().optional(),
  category: z.string().optional(),
  coverImage: z.string().optional(),
  issn: z.string().optional(),
  status: z.enum(['active', 'coming-soon', 'archived']).optional(),
});

// GET /api/subjects
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'subjects:all';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const subjects = await Subject.find().sort({ name: 1 }).lean();

    // Get paper counts per subject
    const counts = await Paper.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const data = subjects.map((s: any) => ({
      ...s,
      paperCount: countMap.get(s._id.toString()) || 0,
    }));

    const response = { success: true, data };
    await cacheSet(cacheKey, JSON.stringify(response), 1800);
    res.json(response);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/subjects
router.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = subjectSchema.parse(req.body);
    const slug = createSlug(data.name);
    const existing = await Subject.findOne({ slug });
    if (existing) {
      res.status(409).json({ success: false, message: 'Subject already exists' });
      return;
    }
    const subject = await Subject.create({ 
      name: data.name, 
      slug,
      shortDescription: data.shortDescription,
      category: data.category,
      coverImage: data.coverImage,
      issn: data.issn,
      status: data.status || 'active',
    });
    await cacheDel('subjects:all');
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/subjects/:id
router.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = subjectSchema.parse(req.body);
    const slug = createSlug(data.name);
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { 
        name: data.name, 
        slug,
        shortDescription: data.shortDescription,
        category: data.category,
        coverImage: data.coverImage,
        issn: data.issn,
        ...(data.status && { status: data.status }),
      },
      { new: true }
    );
    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }
    await cacheDel('subjects:all');
    res.json({ success: true, data: subject });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const paperCount = await Paper.countDocuments({ subject: req.params.id });
    if (paperCount > 0) {
      res.status(400).json({ success: false, message: `Cannot delete: ${paperCount} papers assigned to this subject` });
      return;
    }
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      res.status(404).json({ success: false, message: 'Subject not found' });
      return;
    }
    await cacheDel('subjects:all');
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
