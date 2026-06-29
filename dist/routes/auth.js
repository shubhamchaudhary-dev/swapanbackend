"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const redis_1 = require("../utils/redis");
const rateLimit_1 = require("../middleware/rateLimit");
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
// Setup Passport Google Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        let user = await User_1.default.findOne({ googleId: profile.id });
        if (!user) {
            user = await User_1.default.findOne({ email: profile.emails?.[0]?.value });
            if (user) {
                user.googleId = profile.id;
                if (!user.avatarUrl && profile.photos?.[0]?.value) {
                    user.avatarUrl = profile.photos[0].value;
                }
                await user.save();
            }
            else {
                user = await User_1.default.create({
                    name: profile.displayName,
                    email: profile.emails?.[0]?.value || '',
                    googleId: profile.id,
                    avatarUrl: profile.photos?.[0]?.value,
                    role: 'reader',
                });
            }
        }
        done(null, user);
    }
    catch (err) {
        done(err);
    }
}));
passport_1.default.serializeUser((user, done) => done(null, user._id));
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.default.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err);
    }
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(['reader', 'researcher']).optional().default('reader'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
function generateToken(userId) {
    const secret = process.env.JWT_SECRET;
    return jsonwebtoken_1.default.sign({ id: userId }, secret, { expiresIn: '7d' });
}
// POST /api/auth/register
router.post('/register', (0, rateLimit_1.createRegisterLimiter)(), async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const existing = await User_1.default.findOne({ email: data.email });
        if (existing) {
            if (!existing.isVerified) {
                // User exists but unverified, update their OTP and resend
                const otp = (0, email_1.generateOTP)();
                existing.otp = otp;
                existing.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                await existing.save();
                await (0, email_1.sendOTPEmail)(existing.email, otp);
                res.status(200).json({ success: true, message: 'Existing unverified account. New OTP sent to email', data: { email: existing.email } });
                return;
            }
            res.status(409).json({ success: false, message: 'Email already registered' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        const otp = (0, email_1.generateOTP)();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const user = await User_1.default.create({
            name: data.name,
            email: data.email,
            passwordHash,
            role: data.role,
            isVerified: false,
            otp,
            otpExpires,
        });
        // Send email asynchronously
        (0, email_1.sendOTPEmail)(user.email, otp).catch(e => console.error(e));
        res.status(201).json({
            success: true,
            message: 'OTP sent to email',
            data: { email: user.email },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
const verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
});
// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const data = verifyOtpSchema.parse(req.body);
        const user = await User_1.default.findOne({ email: data.email });
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
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/auth/login
router.post('/login', (0, rateLimit_1.createLoginLimiter)(), async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        const user = await User_1.default.findOne({ email: data.email });
        if (!user || !user.passwordHash) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        // Require email verification
        if (!user.isVerified) {
            // Send a fresh OTP to the user since they tried to login
            const otp = (0, email_1.generateOTP)();
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();
            (0, email_1.sendOTPEmail)(user.email, otp).catch(e => console.error(e));
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
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/auth/logout
router.post('/logout', auth_1.authenticate, async (req, res) => {
    const authReq = req;
    try {
        if (authReq.token) {
            const decoded = jsonwebtoken_1.default.decode(authReq.token);
            const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
            if (ttl > 0) {
                await (0, redis_1.blacklistToken)(authReq.token, ttl);
            }
        }
        res.json({ success: true, data: null });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        data: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, institution: user.institution, isRootAdmin: user.isRootAdmin },
    });
});
// GET /api/auth/google
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
// GET /api/auth/google/callback
router.get('/google/callback', passport_1.default.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }), async (req, res) => {
    const pUser = req.user;
    if (!pUser) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
        return;
    }
    const token = generateToken(pUser._id.toString());
    // Auto-verify if they connect via Google (since Google verifies email)
    const user = await User_1.default.findById(pUser._id);
    if (user && !user.isVerified) {
        user.isVerified = true;
        await user.save();
    }
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});
exports.default = router;
//# sourceMappingURL=auth.js.map