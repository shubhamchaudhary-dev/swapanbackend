import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Subscriber from '../models/Subscriber';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// POST /api/subscribers - Subscribe to newsletter (Public)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = subscribeSchema.parse(req.body);
    
    // Check if already subscribed
    const existing = await Subscriber.findOne({ email });
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

    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();

    res.status(201).json({ message: 'Successfully subscribed to the newsletter!', subscriber: newSubscriber });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscribers - Get all subscribers (Admin only)
router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    console.error('Fetch subscribers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscribers/:id - Delete a subscriber (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      res.status(404).json({ error: 'Subscriber not found' });
      return;
    }
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
