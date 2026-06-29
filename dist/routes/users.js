"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../utils/cloudinary");
const router = (0, express_1.Router)();
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    institution: zod_1.z.string().max(200).optional(),
    phone: zod_1.z.string().max(20).optional(),
    dob: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    department: zod_1.z.string().max(200).optional(),
    designation: zod_1.z.string().max(200).optional(),
    fieldOfResearch: zod_1.z.string().max(200).optional(),
    researchInterests: zod_1.z.string().max(500).optional(),
    highestQualification: zod_1.z.string().max(200).optional(),
    orcid: zod_1.z.string().max(50).optional(),
    googleScholar: zod_1.z.string().max(200).optional(),
    linkedin: zod_1.z.string().max(200).optional(),
    bio: zod_1.z.string().max(2000).optional(),
    country: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    city: zod_1.z.string().max(100).optional(),
    availableAsReviewer: zod_1.z.boolean().optional(),
    emailNotifications: zod_1.z.boolean().optional(),
    newIssueAlerts: zod_1.z.boolean().optional(),
});
// GET /api/users/me
router.get('/me', auth_1.authenticate, (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        data: user, // Send full user object so frontend has all fields
    });
});
// PUT /api/users/me
router.put('/me', auth_1.authenticate, cloudinary_1.uploadImage.single('avatar'), async (req, res) => {
    try {
        const data = updateSchema.parse(req.body);
        const update = { ...data };
        if (req.file) {
            update.avatarUrl = req.file.path;
        }
        const user = await User_1.default.findByIdAndUpdate(req.user._id, update, { new: true }).select('-passwordHash');
        res.json({
            success: true,
            data: user, // Send full updated user object
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
exports.default = router;
//# sourceMappingURL=users.js.map