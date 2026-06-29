import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Inquiry from '../models/Inquiry';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  affiliation: z.string().optional(),
  inquiryType: z.enum(['general', 'submission', 'editorial', 'partnership']),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
});

// POST /api/inquiries - Submit a new inquiry (Public)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = inquirySchema.parse(req.body);
    
    const newInquiry = new Inquiry(validatedData);
    await newInquiry.save();

    res.status(201).json({ message: 'Inquiry submitted successfully', inquiry: newInquiry });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Submit inquiry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/inquiries - Get all inquiries (Admin only)
router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    console.error('Fetch inquiries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/inquiries/:id/read - Mark inquiry as read (Admin only)
router.patch('/:id/read', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }
    res.json({ message: 'Inquiry marked as read', inquiry });
  } catch (error) {
    console.error('Mark read inquiry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/inquiries/:id - Delete an inquiry (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }
    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
