import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Feedback from '../models/Feedback';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const feedbackSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  feedbackType: z.enum(['Bug Report', 'Feature Request', 'General Inquiry', 'Other']),
  message: z.string().min(5, 'Message must be at least 5 characters long'),
});

// POST /api/feedback - Submit feedback (Public)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = feedbackSchema.parse(req.body);
    
    const newFeedback = new Feedback(data);
    await newFeedback.save();

    res.status(201).json({ message: 'Thank you for your feedback!', feedback: newFeedback });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/feedback - Get all feedback (Admin only)
router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbackList);
  } catch (error) {
    console.error('Fetch feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/feedback/:id - Delete a feedback entry (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
