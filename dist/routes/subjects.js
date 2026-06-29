"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Subject_1 = __importDefault(require("../models/Subject"));
const Paper_1 = __importDefault(require("../models/Paper"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const redis_1 = require("../utils/redis");
const slugify_1 = require("../utils/slugify");
const router = (0, express_1.Router)();
const subjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
});
// GET /api/subjects
router.get('/', async (_req, res) => {
    try {
        const cacheKey = 'subjects:all';
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            res.json(JSON.parse(cached));
            return;
        }
        const subjects = await Subject_1.default.find().sort({ name: 1 }).lean();
        // Get paper counts per subject
        const counts = await Paper_1.default.aggregate([
            { $match: { status: 'published' } },
            { $group: { _id: '$subject', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
        const data = subjects.map((s) => ({
            ...s,
            paperCount: countMap.get(s._id.toString()) || 0,
        }));
        const response = { success: true, data };
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(response), 1800);
        res.json(response);
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/subjects
router.post('/', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const data = subjectSchema.parse(req.body);
        const slug = (0, slugify_1.createSlug)(data.name);
        const existing = await Subject_1.default.findOne({ slug });
        if (existing) {
            res.status(409).json({ success: false, message: 'Subject already exists' });
            return;
        }
        const subject = await Subject_1.default.create({ name: data.name, slug });
        await (0, redis_1.cacheDel)('subjects:all');
        res.status(201).json({ success: true, data: subject });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/subjects/:id
router.put('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const data = subjectSchema.parse(req.body);
        const slug = (0, slugify_1.createSlug)(data.name);
        const subject = await Subject_1.default.findByIdAndUpdate(req.params.id, { name: data.name, slug }, { new: true });
        if (!subject) {
            res.status(404).json({ success: false, message: 'Subject not found' });
            return;
        }
        await (0, redis_1.cacheDel)('subjects:all');
        res.json({ success: true, data: subject });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// DELETE /api/subjects/:id
router.delete('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const paperCount = await Paper_1.default.countDocuments({ subject: req.params.id });
        if (paperCount > 0) {
            res.status(400).json({ success: false, message: `Cannot delete: ${paperCount} papers assigned to this subject` });
            return;
        }
        const subject = await Subject_1.default.findByIdAndDelete(req.params.id);
        if (!subject) {
            res.status(404).json({ success: false, message: 'Subject not found' });
            return;
        }
        await (0, redis_1.cacheDel)('subjects:all');
        res.json({ success: true, data: null });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=subjects.js.map