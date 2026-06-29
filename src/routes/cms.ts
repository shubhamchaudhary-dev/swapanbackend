import { Router, Request, Response } from 'express';
import { z } from 'zod';
import CMSConfig from '../models/CMSConfig';

import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { cacheGet, cacheSet, cacheDel } from '../utils/redis';

const router = Router();

const CMS_KEY = 'homepage';

const cmsSchema = z.object({
  heroHeadline: z.string().min(5).max(200).optional(),
  heroSubheadline: z.string().max(500).optional(),
  featuredPaperIds: z.array(z.string()).max(6).optional(),
  featuredJournalIds: z.array(z.string()).max(10).optional(),
  stats: z
    .object({
      papers: z.number().min(0),
      authors: z.number().min(0),
      institutions: z.number().min(0),
    })
    .optional(),
  requireMembershipForAllPapers: z.boolean().optional(),
  enablePublicationPayment: z.boolean().optional(),
  publicationFeeAmount: z.number().min(0).optional(),
  publicationFeeCurrency: z.string().optional(),
  razorpayKeyId: z.string().optional(),
  razorpaySecretKey: z.string().optional(),
  membershipFeeMonthly: z.number().min(0).optional(),
  membershipFeeYearly: z.number().min(0).optional(),
  membershipFeeLifetime: z.number().min(0).optional(),
});

// GET /api/cms
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'cms:homepage';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    let config = await CMSConfig.findOne({ key: CMS_KEY })
      .populate('value.featuredPaperIds', 'title slug abstract authors subject publishedAt views downloads')
      .populate('value.featuredJournalIds', 'name slug shortDescription category coverImage status');
    if (!config) {
      config = await CMSConfig.create({ key: CMS_KEY, value: {} });
    }

    const response = { success: true, data: config };
    await cacheSet(cacheKey, JSON.stringify(response), 300);
    res.json(response);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/cms
router.put('/', authenticate, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = cmsSchema.parse(req.body);
    const config = await CMSConfig.findOneAndUpdate(
      { key: CMS_KEY },
      { $set: { 
        'value.heroHeadline': data.heroHeadline, 
        'value.heroSubheadline': data.heroSubheadline, 
        'value.featuredPaperIds': data.featuredPaperIds, 
        'value.featuredJournalIds': data.featuredJournalIds,
        'value.stats': data.stats,
        'value.requireMembershipForAllPapers': data.requireMembershipForAllPapers,
        'value.enablePublicationPayment': data.enablePublicationPayment,
        'value.publicationFeeAmount': data.publicationFeeAmount,
        'value.publicationFeeCurrency': data.publicationFeeCurrency,
        'value.razorpayKeyId': data.razorpayKeyId,
        'value.razorpaySecretKey': data.razorpaySecretKey,
        'value.membershipFeeMonthly': data.membershipFeeMonthly,
        'value.membershipFeeYearly': data.membershipFeeYearly,
        'value.membershipFeeLifetime': data.membershipFeeLifetime
      } },
      { new: true, upsert: true }
    );
    await cacheDel('cms:homepage');
    res.json({ success: true, data: config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/cms/journals
router.get('/journals', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'cms:journals';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    let config = await CMSConfig.findOne({ key: CMS_KEY })
      .populate('value.featuredJournalIds', 'name slug shortDescription category coverImage status');
    
    let journals: any[] = [];
    if (config && config.value.featuredJournalIds) {
      journals = config.value.featuredJournalIds;
    }

    const response = { success: true, data: journals };
    
    await cacheSet(cacheKey, JSON.stringify(response), 300);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
