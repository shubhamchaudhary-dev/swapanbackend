import { Router, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadImage } from '../utils/cloudinary';

const router = Router();

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  institution: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  department: z.string().max(200).optional(),
  designation: z.string().max(200).optional(),
  fieldOfResearch: z.string().max(200).optional(),
  researchInterests: z.string().max(500).optional(),
  highestQualification: z.string().max(200).optional(),
  orcid: z.string().max(50).optional(),
  googleScholar: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  availableAsReviewer: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  newIssueAlerts: z.boolean().optional(),
});

// GET /api/users/me
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  res.json({
    success: true,
    data: user, // Send full user object so frontend has all fields
  });
});

// PUT /api/users/me
router.put('/me', authenticate, uploadImage.single('avatar'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateSchema.parse(req.body);
    const update: Record<string, unknown> = { ...data };
    
    if (req.file) {
      update.avatarUrl = (req.file as Express.Multer.File & { path: string }).path;
    }
    const user = await User.findByIdAndUpdate(req.user!._id, update, { new: true }).select('-passwordHash');
    res.json({
      success: true,
      data: user, // Send full updated user object
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
