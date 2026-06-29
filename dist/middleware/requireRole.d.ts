import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../models/User';
export declare function requireRole(...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requireRole.d.ts.map