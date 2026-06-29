import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from '../utils/redis';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check blacklist
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      res.status(401).json({ success: false, message: 'Token has been revoked' });
      return;
    }

    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as { id: string };

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // Auto-promote to root admin if email matches ROOT_ADMIN_EMAIL env var
    const rootAdminEmail = process.env.ROOT_ADMIN_EMAIL?.toLowerCase().trim();
    if (rootAdminEmail && user.email === rootAdminEmail && !user.isRootAdmin) {
      user.isRootAdmin = true;
      user.role = 'admin';
      await user.save();
    }

    req.user = user;
    req.token = token;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as { id: string };
    User.findById(decoded.id)
      .select('-passwordHash')
      .then((user) => {
        if (user) {
          req.user = user;
          req.token = token;
        }
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}
