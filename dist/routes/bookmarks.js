"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Bookmark_1 = __importDefault(require("../models/Bookmark"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/bookmarks
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const bookmarks = await Bookmark_1.default.find({ userId: req.user._id })
            .populate({
            path: 'paperId',
            populate: { path: 'subject', select: 'name slug' },
        })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: bookmarks });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/bookmarks
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { paperId } = req.body;
        if (!paperId) {
            res.status(400).json({ success: false, message: 'paperId is required' });
            return;
        }
        const bookmark = await Bookmark_1.default.findOneAndUpdate({ userId: req.user._id, paperId }, { userId: req.user._id, paperId }, { upsert: true, new: true });
        res.status(201).json({ success: true, data: bookmark });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// DELETE /api/bookmarks/:paperId
router.delete('/:paperId', auth_1.authenticate, async (req, res) => {
    try {
        await Bookmark_1.default.findOneAndDelete({ userId: req.user._id, paperId: req.params.paperId });
        res.json({ success: true, data: null });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=bookmarks.js.map