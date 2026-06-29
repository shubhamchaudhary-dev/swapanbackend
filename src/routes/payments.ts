import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { authenticate as protect, AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Paper from '../models/Paper';
import CmsConfig from '../models/CMSConfig';
import User from '../models/User';

const router = express.Router();

// Helper to get CMS Config
async function getCmsConfig() {
  const config = await CmsConfig.findOne({ key: 'homepage' });
  return config?.value;
}

// @route   POST /api/payments/create-order
// @desc    Create a Razorpay order for paper publication
// @access  Private
router.post('/create-order', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const { paperId } = req.body;
    const paper = await Paper.findById(paperId);

    if (!paper) {
      res.status(404).json({ success: false, message: 'Paper not found' });
      return;
    }

    if (paper.status !== 'payment_pending') {
      res.status(400).json({ success: false, message: 'Paper is not pending payment' });
      return;
    }

    const config = await getCmsConfig();
    if (!config?.enablePublicationPayment) {
      res.status(400).json({ success: false, message: 'Payments are not enabled' });
      return;
    }

    if (!config?.razorpayKeyId?.trim() || !config?.razorpaySecretKey?.trim()) {
      res.status(400).json({ success: false, message: 'Payment gateway is not configured yet. Please contact the administrator.' });
      return;
    }

    const razorpay = new Razorpay({
      key_id: config.razorpayKeyId || '',
      key_secret: config.razorpaySecretKey || '',
    });

    const amountInPaise = (config.publicationFeeAmount || 0) * 100;
    const currency = config.publicationFeeCurrency || 'INR';

    const receiptId = `pub_${req.user._id.toString().substring(0, 10)}_${Date.now().toString().substring(6)}`;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receiptId,
    });

    const payment = await Payment.create({
      paperId: paper._id,
      authorId: req.user._id,
      razorpayOrderId: order.id,
      amount: config.publicationFeeAmount || 0,
      currency,
      status: 'pending',
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency,
      keyId: config.razorpayKeyId,
    });
  } catch (error: any) {
    console.error('Create Order error:', error);
    const errorMessage = error.error?.description || error.message || 'Unknown error from payment gateway';
    res.status(500).json({ success: false, message: `Failed to create order: ${errorMessage}` });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment signature
// @access  Private
router.post('/verify', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paperId } = req.body;

    const config = await getCmsConfig();
    if (!config?.razorpaySecretKey?.trim()) {
      res.status(500).json({ success: false, message: 'Razorpay secret key not configured' });
      return;
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpaySecretKey)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
      return;
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment record not found' });
      return;
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'success';
    payment.paidAt = new Date();
    await payment.save();

    // Update paper status to published
    const paper = await Paper.findById(paperId);
    if (paper) {
      paper.status = 'published';
      paper.publishedAt = new Date();
      await paper.save();
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error: any) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// @route   GET /api/payments/receipt/:paperId
// @desc    Get the successful payment receipt details for a paper
// @access  Private
router.get('/receipt/:paperId', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const payment = await Payment.findOne({
      paperId: req.params.paperId,
      status: 'success'
    })
      .populate('paperId', 'title')
      .populate('authorId', 'name email');

    if (!payment) {
      res.status(404).json({ success: false, message: 'Receipt not found' });
      return;
    }

    // Only allow author or admin to view receipt
    if (payment.authorId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to view this receipt' });
      return;
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/payments/create-membership-order
// @desc    Create a Razorpay order for membership
// @access  Private
router.post('/create-membership-order', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const { planType } = req.body;
    if (!['monthly', 'yearly', 'lifetime'].includes(planType)) {
      res.status(400).json({ success: false, message: 'Invalid plan type' });
      return;
    }

    const config = await getCmsConfig();
    if (!config?.razorpayKeyId?.trim() || !config?.razorpaySecretKey?.trim()) {
      res.status(400).json({ success: false, message: 'Payment gateway is not configured yet. Please contact the administrator.' });
      return;
    }

    let amount = 0;
    if (planType === 'monthly') amount = config.membershipFeeMonthly || 199;
    if (planType === 'yearly') amount = config.membershipFeeYearly || 1999;
    if (planType === 'lifetime') amount = config.membershipFeeLifetime || 9999;

    const amountInPaise = amount * 100;
    const currency = 'INR';

    const razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpaySecretKey,
    });

    const receiptId = `mem_${req.user._id.toString().substring(0, 10)}_${Date.now().toString().substring(6)}`;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receiptId,
    });

    await Payment.create({
      authorId: req.user._id,
      purpose: 'membership',
      planType,
      razorpayOrderId: order.id,
      amount,
      currency,
      status: 'pending',
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      currency,
      keyId: config.razorpayKeyId,
    });
  } catch (error: any) {
    console.error('Create Membership Order error:', error);
    const errorMessage = error.error?.description || error.message || 'Unknown error from payment gateway';
    res.status(500).json({ success: false, message: `Failed to create order: ${errorMessage}` });
  }
});

// @route   POST /api/payments/verify-membership
// @desc    Verify Razorpay payment signature for membership
// @access  Private
router.post('/verify-membership', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const config = await getCmsConfig();
    if (!config?.razorpaySecretKey?.trim()) {
      res.status(500).json({ success: false, message: 'Razorpay secret key not configured' });
      return;
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpaySecretKey)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
      return;
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, purpose: 'membership' });
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment record not found' });
      return;
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'success';
    payment.paidAt = new Date();
    await payment.save();

    // Activate membership for user
    const user = await User.findById(payment.authorId);
    if (user && payment.planType) {
      user.hasMembership = true;
      user.membershipPlan = payment.planType;
      
      const now = new Date();
      if (payment.planType === 'monthly') {
        user.membershipExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
      } else if (payment.planType === 'yearly') {
        user.membershipExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
      } else if (payment.planType === 'lifetime') {
        user.membershipExpiresAt = undefined; // No expiration
      }
      await user.save();
    }

    res.json({ success: true, message: 'Membership activated successfully' });
  } catch (error: any) {
    console.error('Membership verify error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify membership payment' });
  }
});
// @route   GET /api/payments/history
// @desc    Get user payment history
// @access  Private
router.get('/history', protect, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const payments = await Payment.find({
      authorId: req.user._id,
      status: 'success'
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('Fetch payment history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

export default router;
