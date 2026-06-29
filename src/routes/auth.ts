import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { z } from 'zod';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { blacklistToken } from '../utils/redis';
import { createLoginLimiter, createRegisterLimiter } from '../middleware/rateLimit';
import crypto from 'crypto';
import { generateOTP, sendOTPEmail, sendPasswordResetEmail } from '../utils/email';

const router = Router();

// Setup Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.findOne({ email: profile.emails?.[0]?.value });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatarUrl && profile.photos?.[0]?.value) {
              user.avatarUrl = profile.photos[0].value;
            }
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails?.[0]?.value || '',
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value,
              role: 'reader',
            });
          }
        }
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => done(null, (user as { _id: string })._id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['reader', 'researcher']).optional().default('reader'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', createRegisterLimiter(), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      if (!existing.isVerified) {
        // User exists but unverified, update their OTP and resend
        const otp = generateOTP();
        existing.otp = otp;
        existing.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await existing.save();
        await sendOTPEmail(existing.email, otp);
        res.status(200).json({ success: true, message: 'Existing unverified account. New OTP sent to email', data: { email: existing.email } });
        return;
      }
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      isVerified: false,
      otp,
      otpExpires,
    });

    // Send email asynchronously
    sendOTPEmail(user.email, otp).catch(e => console.error(e));

    res.status(201).json({
      success: true,
      message: 'OTP sent to email',
      data: { email: user.email },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ success: false, message: 'User already verified' });
      return;
    }

    if (!user.otp || user.otp !== data.otp) {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
      return;
    }

    if (!user.otpExpires || new Date() > user.otpExpires) {
      res.status(400).json({ success: false, message: 'OTP has expired' });
      return;
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString());
    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', createLoginLimiter(), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Require email verification
    if (!user.isVerified) {
      // Send a fresh OTP to the user since they tried to login
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      sendOTPEmail(user.email, otp).catch(e => console.error(e));

      res.status(403).json({ success: false, message: 'Please verify your email. A new OTP has been sent.', requires_verification: true, email: user.email });
      return;
    }

    const token = generateToken(user._id.toString());
    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    if (authReq.token) {
      const decoded = jwt.decode(authReq.token) as { exp?: number } | null;
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
      if (ttl > 0) {
        await blacklistToken(authReq.token, ttl);
      }
    }
    res.json({ success: true, data: null });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response): void => {
  const user = (req as AuthRequest).user!;
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      institution: user.institution,
      isRootAdmin: user.isRootAdmin,
      phone: user.phone,
      dob: user.dob,
      gender: user.gender,
      department: user.department,
      designation: user.designation,
      fieldOfResearch: user.fieldOfResearch,
      researchInterests: user.researchInterests,
      highestQualification: user.highestQualification,
      orcid: user.orcid,
      googleScholar: user.googleScholar,
      linkedin: user.linkedin,
      bio: user.bio,
      country: user.country,
      state: user.state,
      city: user.city,
      availableAsReviewer: user.availableAsReviewer,
      emailNotifications: user.emailNotifications,
      newIssueAlerts: user.newIssueAlerts,
      certificates: user.certificates,
      hasMembership: user.hasMembership,
      membershipPlan: user.membershipPlan,
      membershipExpiresAt: user.membershipExpiresAt,
    },
  });
});

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  async (req: Request, res: Response): Promise<void> => {
    const pUser = req.user as { _id: string } | undefined;
    if (!pUser) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
      return;
    }
    const token = generateToken(pUser._id.toString());

    // Auto-verify if they connect via Google (since Google verifies email)
    const user = await User.findById(pUser._id);
    if (user && !user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// PUT /api/auth/update-password
router.put('/update-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user!._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success anyway to prevent email enumeration
      res.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    sendPasswordResetEmail(user.email, token).catch(e => console.error(e));

    res.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Invalid data' });
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
