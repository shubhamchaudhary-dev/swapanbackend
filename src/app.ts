import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';

import authRoutes from './routes/auth';
import paperRoutes from './routes/papers';
import subjectRoutes from './routes/subjects';
import bookmarkRoutes from './routes/bookmarks';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import cmsRoutes from './routes/cms';
import inquiryRoutes from './routes/inquiries';
import subscriberRoutes from './routes/subscribers';
import feedbackRoutes from './routes/feedback';
import paymentRoutes from './routes/payments';

import { createAuthenticatedLimiter, createUnauthenticatedLimiter } from './middleware/rateLimit';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());

// Global rate limiting
app.use('/api/', createAuthenticatedLimiter());
app.use('/api/', createUnauthenticatedLimiter());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default app;
