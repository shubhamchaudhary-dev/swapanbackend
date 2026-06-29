import { Router, Response } from 'express';
import Bookmark from '../models/Bookmark';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/bookmarks
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user!._id })
      .populate({
        path: 'paperId',
        populate: { path: 'subject', select: 'name slug' },
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: bookmarks });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/bookmarks
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paperId } = req.body;
    if (!paperId) {
      res.status(400).json({ success: false, message: 'paperId is required' });
      return;
    }
    const bookmark = await Bookmark.findOneAndUpdate(
      { userId: req.user!._id, paperId },
      { userId: req.user!._id, paperId },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: bookmark });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/bookmarks/:paperId
router.delete('/:paperId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Bookmark.findOneAndDelete({ userId: req.user!._id, paperId: req.params.paperId });
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
