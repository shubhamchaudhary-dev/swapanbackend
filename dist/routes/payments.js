"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const auth_1 = require("../middleware/auth");
const Payment_1 = __importDefault(require("../models/Payment"));
const Paper_1 = __importDefault(require("../models/Paper"));
const CMSConfig_1 = __importDefault(require("../models/CMSConfig"));
const router = express_1.default.Router();
// Helper to get CMS Config
async function getCmsConfig() {
    const config = await CMSConfig_1.default.findOne({ key: 'global_config' });
    return config?.value;
}
// @route   POST /api/payments/create-order
// @desc    Create a Razorpay order for paper publication
// @access  Private
router.post('/create-order', auth_1.authenticate, async (req, res) => {
    try {
        const { paperId } = req.body;
        const paper = await Paper_1.default.findById(paperId);
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
        const razorpay = new razorpay_1.default({
            key_id: config.razorpayKeyId || '',
            key_secret: config.razorpaySecretKey || '',
        });
        const amountInPaise = (config.publicationFeeAmount || 0) * 100;
        const currency = config.publicationFeeCurrency || 'INR';
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency,
            receipt: `receipt_${paper._id}`,
        });
        const payment = await Payment_1.default.create({
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
    }
    catch (error) {
        console.error('Create Order error:', error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
});
// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment signature
// @access  Private
router.post('/verify', auth_1.authenticate, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paperId } = req.body;
        const config = await getCmsConfig();
        if (!config?.razorpaySecretKey) {
            res.status(500).json({ success: false, message: 'Razorpay secret key not configured' });
            return;
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', config.razorpaySecretKey)
            .update(body.toString())
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
            return;
        }
        const payment = await Payment_1.default.findOne({ razorpayOrderId: razorpay_order_id });
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
        const paper = await Paper_1.default.findById(paperId);
        if (paper) {
            paper.status = 'published';
            paper.publishedAt = new Date();
            await paper.save();
        }
        res.json({ success: true, message: 'Payment verified successfully' });
    }
    catch (error) {
        console.error('Payment verify error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map