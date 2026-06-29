"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const CMSConfig_1 = __importDefault(require("../models/CMSConfig"));
const Journal_1 = __importDefault(require("../models/Journal"));
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const redis_1 = require("../utils/redis");
const router = (0, express_1.Router)();
const CMS_KEY = 'homepage';
const cmsSchema = zod_1.z.object({
    heroHeadline: zod_1.z.string().min(5).max(200).optional(),
    heroSubheadline: zod_1.z.string().max(500).optional(),
    featuredPaperIds: zod_1.z.array(zod_1.z.string()).max(6).optional(),
    stats: zod_1.z
        .object({
        papers: zod_1.z.number().min(0),
        authors: zod_1.z.number().min(0),
        institutions: zod_1.z.number().min(0),
    })
        .optional(),
    requireMembershipForAllPapers: zod_1.z.boolean().optional(),
});
// GET /api/cms
router.get('/', async (_req, res) => {
    try {
        const cacheKey = 'cms:homepage';
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            res.json(JSON.parse(cached));
            return;
        }
        let config = await CMSConfig_1.default.findOne({ key: CMS_KEY }).populate('value.featuredPaperIds', 'title slug abstract authors subject publishedAt views downloads');
        if (!config) {
            config = await CMSConfig_1.default.create({ key: CMS_KEY, value: {} });
        }
        const response = { success: true, data: config };
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(response), 300);
        res.json(response);
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// PUT /api/cms
router.put('/', auth_1.authenticate, (0, requireRole_1.requireRole)('admin'), async (req, res) => {
    try {
        const data = cmsSchema.parse(req.body);
        const config = await CMSConfig_1.default.findOneAndUpdate({ key: CMS_KEY }, { $set: {
                'value.heroHeadline': data.heroHeadline,
                'value.heroSubheadline': data.heroSubheadline,
                'value.featuredPaperIds': data.featuredPaperIds,
                'value.stats': data.stats,
                'value.requireMembershipForAllPapers': data.requireMembershipForAllPapers
            } }, { new: true, upsert: true });
        await (0, redis_1.cacheDel)('cms:homepage');
        res.json({ success: true, data: config });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.errors[0].message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /api/cms/journals
router.get('/journals', async (_req, res) => {
    try {
        const cacheKey = 'cms:journals';
        const cached = await (0, redis_1.cacheGet)(cacheKey);
        if (cached) {
            res.json(JSON.parse(cached));
            return;
        }
        const journals = await Journal_1.default.find({ status: { $ne: 'archived' } }).sort({ createdAt: -1 });
        const response = { success: true, data: journals };
        await (0, redis_1.cacheSet)(cacheKey, JSON.stringify(response), 300);
        res.json(response);
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=cms.js.map