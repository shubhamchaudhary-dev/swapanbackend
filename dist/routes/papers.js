"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Paper_1 = __importDefault(require("../models/Paper"));
const CMSConfig_1 = __importDefault(require("../models/CMSConfig"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const redis_1 = require("../utils/redis");
const redis_2 = require("../utils/redis");
const slugify_1 = require("../utils/slugify");
const router = (0, express_1.Router)();
const paperSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(300),
    abstract: zod_1.z.string().min(20),
    authors: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.array(zod_1.z.string()).min(1)]),
    subjectId: zod_1.z.string().min(1),
});
// GET /api/papers
router.get('/', auth_1.optionalAuth, async (req, res) => {
    try {
        const { subject, q, page = '1', limit = '12' } = req.query;
        const cacheKey = `papers:${JSON.stringify({ subject, q, page, limit })}`;
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            res.json(JSON.parse(cached));
            return;
        }
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        const query = { status: 'published' };
        if (subject)
            query.subject = subject;
        if (q)
            query.$text = { $search: q };
        const [papers, total] = await Promise.all([
            Paper_1.default.find(query)
                .populate('subject', 'name slug')
                .populate('createdBy', 'name institution')
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Paper_1.default.countDocuments(query),
        ]);
        const response = {
            success: true,
            data: papers,
            pagination: { page: pageNum, limit: limitNum, total },
        };
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(response), 120);
        res.json(response);
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
let lastReqBody = null;
// GET /api/papers/debug
router.get('/debug', (req, res) => {
    res.json({ lastReqBody });
});
// POST /api/papers
router.post('/', auth_1.authenticate, async (req, res) => {
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
        const slug = (0, slugify_1.createUniqueSlug)(data.title);
        const paper = await Paper_1.default.create({
            title: data.title,
            abstract: data.abstract,
            pdfUrl,
            authors,
            subject: data.subjectId,
            status: 'submitted',
            createdBy: req.user._id,
            slug,
            ...(req.body.coverLetterUrl && { coverLetterUrl: req.body.coverLetterUrl }),
            ...(req.body.coverLetterName && { coverLetterName: req.body.coverLetterName }),
            ...(req.body.reviewers && Array.isArray(req.body.reviewers) && { reviewers: req.body.reviewers }),
            ...(req.body.keywords && Array.isArray(req.body.keywords) && { keywords: req.body.keywords }),
            ...(req.body.highlights && { highlights: req.body.highlights }),
        });
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.status(201).json({ success: true, data: paper });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/papers/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const papers = await Paper_1.default.find({ createdBy: req.user._id })
            .populate('subject', 'name slug')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: papers });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/papers/:slug
router.get('/:slug', auth_1.optionalAuth, async (req, res) => {
    try {
        const paper = await Paper_1.default.findOne({ slug: req.params.slug, status: 'published' })
            .populate('subject', 'name slug')
            .populate('createdBy', 'name institution');
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        // View debounce
        if (req.user) {
            const viewed = await (0, redis_2.hasUserViewedPaper)(req.user._id.toString(), paper._id.toString());
            if (!viewed) {
                await Paper_1.default.findByIdAndUpdate(paper._id, { $inc: { views: 1 } });
                await (0, redis_2.markUserViewedPaper)(req.user._id.toString(), paper._id.toString());
                paper.views += 1;
            }
        }
        // Related papers
        const related = await Paper_1.default.find({
            subject: paper.subject,
            status: 'published',
            _id: { $ne: paper._id },
        })
            .populate('subject', 'name slug')
            .limit(3)
            .lean();
        // Check Membership Locking
        let isLocked = false;
        const cmsConfig = await CMSConfig_1.default.findOne({ key: 'homepage' });
        const globalLock = cmsConfig?.value?.requireMembershipForAllPapers || false;
        const paperLock = paper.requiresMembership || false;
        if (globalLock || paperLock) {
            if (!req.user) {
                isLocked = true;
            }
            else {
                const userDoc = await User_1.default.findById(req.user._id);
                if (!userDoc?.hasMembership) {
                    isLocked = true;
                }
            }
        }
        res.json({ success: true, data: { paper, related, isLocked } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/papers/:id
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const paper = await Paper_1.default.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        const isOwner = paper.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
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
                    paper[key] = req.body[key].split(',').map((a) => a.trim()).filter(Boolean);
                }
                else {
                    paper[key] = req.body[key];
                }
            }
        }
        await paper.save();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// DELETE /api/papers/:id
router.delete('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (_req, res) => {
    try {
        const paper = await Paper_1.default.findByIdAndDelete(_req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: null });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/papers/:id/publish
router.post('/:id/publish', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const paper = await Paper_1.default.findByIdAndUpdate(req.params.id, { status: 'published', publishedAt: new Date() }, { new: true });
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/papers/:id/download
router.post('/:id/download', async (req, res) => {
    try {
        const paper = await Paper_1.default.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        res.json({ success: true, data: { pdfUrl: paper.pdfUrl } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/papers/:id/request-correction
router.post('/:id/request-correction', auth_1.authenticate, async (req, res) => {
    try {
        const paper = await Paper_1.default.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        if (paper.createdBy.toString() !== req.user._id.toString()) {
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
        paper.status = 'correction_requested';
        paper.correctionRequested = true;
        paper.correctionRequestCount = (paper.correctionRequestCount || 0) + 1;
        await paper.save();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/papers/:id/approve-proof
router.post('/:id/approve-proof', auth_1.authenticate, async (req, res) => {
    try {
        const paper = await Paper_1.default.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        if (paper.createdBy.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }
        if (paper.status !== 'pre_proof') {
            res.status(400).json({ success: false, message: 'Paper is not in pre-proof stage' });
            return;
        }
        const config = await CMSConfig_1.default.findOne({ key: 'global_config' });
        const requirePayment = config?.value?.enablePublicationPayment || false;
        paper.proofApproved = true;
        paper.proofApprovedAt = new Date();
        paper.paymentRequired = requirePayment;
        if (requirePayment) {
            paper.status = 'payment_pending';
        }
        else {
            paper.status = 'published';
            paper.publishedAt = new Date();
        }
        await paper.save();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=papers.js.map