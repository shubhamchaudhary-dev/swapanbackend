import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: any;
    token?: string;
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map