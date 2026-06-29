"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Feedback_1 = __importDefault(require("../models/Feedback"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
const feedbackSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Invalid email address').optional().or(zod_1.z.literal('')),
    feedbackType: zod_1.z.enum(['Bug Report', 'Feature Request', 'General Inquiry', 'Other']),
    message: zod_1.z.string().min(5, 'Message must be at least 5 characters long'),
});
// POST /api/feedback - Submit feedback (Public)
router.post('/', async (req, res) => {
    try {
        const data = feedbackSchema.parse(req.body);
        const newFeedback = new Feedback_1.default(data);
        await newFeedback.save();
        res.status(201).json({ message: 'Thank you for your feedback!', feedback: newFeedback });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET /api/feedback - Get all feedback (Admin only)
router.get('/', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const feedbackList = await Feedback_1.default.find().sort({ createdAt: -1 });
        res.json(feedbackList);
    }
    catch (error) {
        console.error('Fetch feedback error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// DELETE /api/feedback/:id - Delete a feedback entry (Admin only)
router.delete('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const feedback = await Feedback_1.default.findByIdAndDelete(req.params.id);
        if (!feedback) {
            res.status(404).json({ error: 'Feedback not found' });
            return;
        }
        res.json({ message: 'Feedback deleted successfully' });
    }
    catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=feedback.js.map