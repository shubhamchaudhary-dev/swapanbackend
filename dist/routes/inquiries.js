"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Inquiry_1 = __importDefault(require("../models/Inquiry"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
const inquirySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Invalid email address'),
    affiliation: zod_1.z.string().optional(),
    inquiryType: zod_1.z.enum(['general', 'submission', 'editorial', 'partnership']),
    message: zod_1.z.string().min(10, 'Message must be at least 10 characters long'),
});
// POST /api/inquiries - Submit a new inquiry (Public)
router.post('/', async (req, res) => {
    try {
        const validatedData = inquirySchema.parse(req.body);
        const newInquiry = new Inquiry_1.default(validatedData);
        await newInquiry.save();
        res.status(201).json({ message: 'Inquiry submitted successfully', inquiry: newInquiry });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Submit inquiry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET /api/inquiries - Get all inquiries (Admin only)
router.get('/', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const inquiries = await Inquiry_1.default.find().sort({ createdAt: -1 });
        res.json(inquiries);
    }
    catch (error) {
        console.error('Fetch inquiries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// PATCH /api/inquiries/:id/read - Mark inquiry as read (Admin only)
router.patch('/:id/read', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const inquiry = await Inquiry_1.default.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        if (!inquiry) {
            res.status(404).json({ error: 'Inquiry not found' });
            return;
        }
        res.json({ message: 'Inquiry marked as read', inquiry });
    }
    catch (error) {
        console.error('Mark read inquiry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// DELETE /api/inquiries/:id - Delete an inquiry (Admin only)
router.delete('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const inquiry = await Inquiry_1.default.findByIdAndDelete(req.params.id);
        if (!inquiry) {
            res.status(404).json({ error: 'Inquiry not found' });
            return;
        }
        res.json({ message: 'Inquiry deleted successfully' });
    }
    catch (error) {
        console.error('Delete inquiry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=inquiries.js.map