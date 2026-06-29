"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../utils/redis");
const User_1 = __importDefault(require("../models/User"));
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        // Check blacklist
        const blacklisted = await (0, redis_1.isTokenBlacklisted)(token);
        if (blacklisted) {
            res.status(401).json({ success: false, message: 'Token has been revoked' });
            return;
        }
        const secret = process.env.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await User_1.default.findById(decoded.id).select('-passwordHash');
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
    }
    catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        User_1.default.findById(decoded.id)
            .select('-passwordHash')
            .then((user) => {
            if (user) {
                req.user = user;
                req.token = token;
            }
            next();
        })
            .catch(() => next());
    }
    catch {
        next();
    }
}
//# sourceMappingURL=auth.js.map