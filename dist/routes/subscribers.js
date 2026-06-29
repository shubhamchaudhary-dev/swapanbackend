"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
const subscribeSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
// POST /api/subscribers - Subscribe to newsletter (Public)
router.post('/', async (req, res) => {
    try {
        const { email } = subscribeSchema.parse(req.body);
        // Check if already subscribed
        const existing = await Subscriber_1.default.findOne({ email });
        if (existing) {
            if (!existing.isActive) {
                existing.isActive = true;
                await existing.save();
                res.status(200).json({ message: 'Successfully resubscribed!', subscriber: existing });
                return;
            }
            res.status(400).json({ error: 'This email is already subscribed.' });
            return;
        }
        const newSubscriber = new Subscriber_1.default({ email });
        await newSubscriber.save();
        res.status(201).json({ message: 'Successfully subscribed to the newsletter!', subscriber: newSubscriber });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors[0].message });
            return;
        }
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET /api/subscribers - Get all subscribers (Admin only)
router.get('/', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const subscribers = await Subscriber_1.default.find().sort({ createdAt: -1 });
        res.json(subscribers);
    }
    catch (error) {
        console.error('Fetch subscribers error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// DELETE /api/subscribers/:id - Delete a subscriber (Admin only)
router.delete('/:id', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const subscriber = await Subscriber_1.default.findByIdAndDelete(req.params.id);
        if (!subscriber) {
            res.status(404).json({ error: 'Subscriber not found' });
            return;
        }
        res.json({ message: 'Subscriber deleted successfully' });
    }
    catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=subscribers.js.map