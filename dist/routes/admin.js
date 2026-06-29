"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const Paper_1 = __importDefault(require("../models/Paper"));
const Journal_1 = __importDefault(require("../models/Journal"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const redis_1 = require("../utils/redis");
const cloudinary_1 = require("../utils/cloudinary");
const Payment_1 = __importDefault(require("../models/Payment"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, requireRole_1.requireRole)('admin'));
// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
    try {
        const [totalUsers, totalPapers, published, underReview, submitted, rejected, paymentPending, paymentCompleted] = await Promise.all([
            User_1.default.countDocuments(),
            Paper_1.default.countDocuments(),
            Paper_1.default.countDocuments({ status: 'published' }),
            Paper_1.default.countDocuments({ status: 'under_review' }),
            Paper_1.default.countDocuments({ status: 'submitted' }),
            Paper_1.default.countDocuments({ status: 'rejected' }),
            Paper_1.default.countDocuments({ status: 'payment_pending' }),
            Paper_1.default.countDocuments({ status: 'payment_completed' }),
        ]);
        const successfulPayments = await Payment_1.default.countDocuments({ status: 'success' });
        const failedPayments = await Payment_1.default.countDocuments({ status: 'failed' });
        // Revenue logic
        const payments = await Payment_1.default.find({ status: 'success' });
        const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = payments
            .filter(p => p.paidAt && p.paidAt.getMonth() === currentMonth && p.paidAt.getFullYear() === currentYear)
            .reduce((acc, curr) => acc + curr.amount, 0);
        res.json({
            success: true,
            data: {
                totalUsers, totalPapers, published, underReview, submitted, rejected,
                paymentPending, paymentCompleted, successfulPayments, failedPayments,
                totalRevenue, monthlyRevenue
            },
        });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/admin/papers
router.get('/papers', async (req, res) => {
    try {
        const { status, subject, page = '1', limit = '20' } = req.query;
        const query = {};
        if (status && status !== 'all')
            query.status = status;
        if (subject)
            query.subject = subject;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        const [papers, total] = await Promise.all([
            Paper_1.default.find(query)
                .populate('subject', 'name slug')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Paper_1.default.countDocuments(query),
        ]);
        res.json({ success: true, data: papers, pagination: { page: pageNum, limit: limitNum, total } });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/admin/papers/:id/membership
router.put('/papers/:id/membership', async (req, res) => {
    try {
        const schema = zod_1.z.object({ requiresMembership: zod_1.z.boolean() });
        const { requiresMembership } = schema.parse(req.body);
        const paper = await Paper_1.default.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        paper.requiresMembership = requiresMembership;
        await paper.save();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/admin/users
router.get('/users', async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: users });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
    try {
        const schema = zod_1.z.object({ role: zod_1.z.enum(['reader', 'researcher', 'admin']) });
        const { role } = schema.parse(req.body);
        if (req.params.id === req.user._id.toString()) {
            res.status(400).json({ success: false, message: 'Cannot change your own role' });
            return;
        }
        // Only root admin can assign or remove the admin role
        const targetUser = await User_1.default.findById(req.params.id).select('-passwordHash');
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const isAdminChange = role === 'admin' || targetUser.role === 'admin';
        if (isAdminChange && !req.user.isRootAdmin) {
            res.status(403).json({ success: false, message: 'Only the Root Admin can assign or remove admin roles' });
            return;
        }
        targetUser.role = role;
        await targetUser.save();
        res.json({ success: true, data: targetUser });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/admin/users/:id/membership
router.put('/users/:id/membership', async (req, res) => {
    try {
        const schema = zod_1.z.object({ hasMembership: zod_1.z.boolean() });
        const { hasMembership } = schema.parse(req.body);
        const targetUser = await User_1.default.findById(req.params.id).select('-passwordHash');
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        targetUser.hasMembership = hasMembership;
        await targetUser.save();
        res.json({ success: true, data: targetUser });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/admin/users/:id/certificates
router.post('/users/:id/certificates', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            pdfBase64: zod_1.z.string().min(1, 'PDF file is required'),
            fileName: zod_1.z.string().min(1, 'File name is required'),
            note: zod_1.z.string().optional(),
        });
        const { pdfBase64, fileName, note } = schema.parse(req.body);
        const targetUser = await User_1.default.findById(req.params.id);
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Upload to Cloudinary
        let fileUrl;
        try {
            fileUrl = await (0, cloudinary_1.uploadBase64)(pdfBase64, 'swarnpublication/certificates', 'raw');
        }
        catch (cloudErr) {
            console.error('[Certificate Upload] Cloudinary error:', cloudErr?.message || cloudErr);
            res.status(500).json({ success: false, message: `File upload failed: ${cloudErr?.message || 'Cloudinary error'}` });
            return;
        }
        // Use $push for reliable subdocument insertion
        const updatedUser = await User_1.default.findByIdAndUpdate(req.params.id, {
            $push: {
                certificates: {
                    fileUrl,
                    fileName,
                    note: note || '',
                    uploadedAt: new Date(),
                }
            }
        }, { new: true, select: '-passwordHash' });
        res.json({ success: true, data: updatedUser });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        console.error('[Certificate Upload] Server error:', err?.message || err);
        res.status(500).json({ success: false, message: err?.message || 'Server error' });
    }
});
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            res.status(400).json({ success: false, message: 'Cannot delete your own account' });
            return;
        }
        // Find target user first to check if they are root admin
        const targetUser = await User_1.default.findById(req.params.id);
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Protect root admin from deletion — by DB flag OR by env email
        const rootAdminEmail = process.env.ROOT_ADMIN_EMAIL?.toLowerCase().trim();
        if (targetUser.isRootAdmin || (rootAdminEmail && targetUser.email === rootAdminEmail)) {
            res.status(403).json({ success: false, message: 'The Root Admin account cannot be deleted' });
            return;
        }
        await targetUser.deleteOne();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: null });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/admin/papers/:id/review
router.put('/papers/:id/review', async (req, res) => {
    try {
        const schema = zod_1.z.object({
            status: zod_1.z.enum(['submitted', 'under_review', 'rejected', 'accepted', 'pre_proof', 'awaiting_author_response', 'correction_requested', 'final_approval', 'payment_pending', 'payment_completed', 'published']),
            remarks: zod_1.z.string().max(2000).optional(),
        });
        const { status, remarks } = schema.parse(req.body);
        const updateData = { status, remarks };
        if (status === 'published') {
            updateData.publishedAt = new Date();
            updateData.correctionFiles = []; // clear all correction files on publish
        }
        const paper = await Paper_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: paper });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// POST /api/admin/papers/:id/upload-pdf
// Upload the final formatted PDF for a published paper.
// Stores the base64 data URI directly (same approach as user submissions).
router.post('/papers/:id/upload-pdf', async (req, res) => {
    try {
        const { pdfBase64 } = req.body;
        if (!pdfBase64) {
            res.status(400).json({ success: false, message: 'pdfBase64 is required' });
            return;
        }
        const paper = await Paper_1.default.findByIdAndUpdate(req.params.id, { publishedPdfUrl: pdfBase64, status: 'published', publishedAt: new Date() }, { new: true });
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: { publishedPdfUrl: pdfBase64 } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err?.message || 'Upload failed' });
    }
});
// POST /api/admin/papers/:id/cover
// Upload a cover image graphic for the paper
router.post('/papers/:id/cover', async (req, res) => {
    try {
        const { coverImageBase64 } = req.body;
        if (!coverImageBase64) {
            res.status(400).json({ success: false, message: 'coverImageBase64 is required' });
            return;
        }
        let fileUrl;
        try {
            fileUrl = await (0, cloudinary_1.uploadBase64)(coverImageBase64, 'swarnpublication/covers', 'image');
        }
        catch (cloudErr) {
            console.error('[Cover Upload] Cloudinary error:', cloudErr?.message || cloudErr);
            res.status(500).json({ success: false, message: `File upload failed: ${cloudErr?.message || 'Cloudinary error'}` });
            return;
        }
        const paper = await Paper_1.default.findByIdAndUpdate(req.params.id, { coverImage: fileUrl }, { new: true });
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: { coverImage: fileUrl } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err?.message || 'Upload failed' });
    }
});
// POST /api/admin/papers/:id/correction-file
// Send correction files to paper author — non-published papers only.
// Appends to existing correctionFiles (does NOT replace). Each image batch ≤ 5.
router.post('/papers/:id/correction-file', async (req, res) => {
    try {
        const { files } = req.body; // Array<{ fileBase64: string; fileName: string }>
        if (!Array.isArray(files) || files.length === 0) {
            res.status(400).json({ success: false, message: 'files array is required' });
            return;
        }
        const paper = await Paper_1.default.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ success: false, message: 'Paper not found' });
            return;
        }
        if (paper.status === 'published') {
            res.status(400).json({ success: false, message: 'Cannot send correction file for a published paper' });
            return;
        }
        // Validate and map incoming files — limit images per batch to 5
        const mapped = [];
        let imageCountInBatch = 0;
        for (const f of files) {
            if (!f.fileBase64 || !f.fileName) {
                res.status(400).json({ success: false, message: 'Each file must have fileBase64 and fileName' });
                return;
            }
            const isImage = /^data:image\//i.test(f.fileBase64);
            if (isImage) {
                imageCountInBatch++;
                if (imageCountInBatch > 5) {
                    res.status(400).json({ success: false, message: 'Maximum 5 images allowed per batch' });
                    return;
                }
            }
            mapped.push({ data: f.fileBase64, type: isImage ? 'image' : 'document', name: f.fileName });
        }
        // APPEND to existing files — PDFs and previous image batches are preserved
        if (!paper.correctionFiles)
            paper.correctionFiles = [];
        paper.correctionFiles.push(...mapped);
        await paper.save();
        await (0, redis_1.cacheDelPattern)('papers:*');
        res.json({ success: true, data: { added: mapped.length, total: paper.correctionFiles.length } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err?.message || 'Upload failed' });
    }
});
// --- JOURNALS CRUD ---
// GET /api/admin/journals
router.get('/journals', async (_req, res) => {
    try {
        const journals = await Journal_1.default.find().sort({ createdAt: -1 });
        res.json({ success: true, data: journals });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err?.message || 'Server error' });
    }
});
// POST /api/admin/journals
router.post('/journals', async (req, res) => {
    try {
        const payload = req.body;
        const journal = new Journal_1.default(payload);
        await journal.save();
        await (0, redis_1.cacheDelPattern)('cms:*');
        res.json({ success: true, data: journal });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err?.message || 'Validation error' });
    }
});
// PUT /api/admin/journals/:id
router.put('/journals/:id', async (req, res) => {
    try {
        const payload = req.body;
        const journal = await Journal_1.default.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!journal) {
            res.status(404).json({ success: false, message: 'Journal not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('cms:*');
        res.json({ success: true, data: journal });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err?.message || 'Validation error' });
    }
});
// DELETE /api/admin/journals/:id
router.delete('/journals/:id', async (req, res) => {
    try {
        const journal = await Journal_1.default.findByIdAndDelete(req.params.id);
        if (!journal) {
            res.status(404).json({ success: false, message: 'Journal not found' });
            return;
        }
        await (0, redis_1.cacheDelPattern)('cms:*');
        res.json({ success: true, data: {} });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err?.message || 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map