"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.sendOTPEmail = sendOTPEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Helper to generate a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendOTPEmail(to, otp) {
    console.log('\n================================');
    console.log(`[Email] OTP for ${to}: ${otp}`);
    console.log('================================\n');
    // Use user's SMTP settings. If not provided, use an ethereal test account automatically.
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    else {
        // Generate test SMTP service account from ethereal.email
        const testAccount = await nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log(`[Email] Using Ethereal test account: ${testAccount.user}`);
    }
    const info = await transporter.sendMail({
        from: '"SwarnPublication" <noreply@swarnpublication.com>',
        to,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${otp}`,
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #122A40;">Verify your email</h2>
        <p>Thanks for registering with SwarnPublication. Use the following OTP to complete your signup process:</p>
        <div style="font-size: 24px; font-weight: bold; text-align: center; background: #f4f4f4; padding: 20px; letter-spacing: 4px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #666;">This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>`,
    });
    console.log('[Email] OTP sent to %s', to);
    if (info.messageId) {
        console.log('[Email] Preview URL: %s', nodemailer_1.default.getTestMessageUrl(info));
    }
}
//# sourceMappingURL=email.js.map