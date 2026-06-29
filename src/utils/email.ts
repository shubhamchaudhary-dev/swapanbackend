import nodemailer from 'nodemailer';

// Helper to generate a 6-digit OTP
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(to: string, otp: string): Promise<void> {
    console.log('\n================================');
    console.log(`[Email] OTP for ${to}: ${otp}`);
    console.log('================================\n');

    // Use user's SMTP settings. If not provided, use an ethereal test account automatically.
    let transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Generate test SMTP service account from ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
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
        console.log('[Email] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
    console.log('\n================================');
    console.log(`[Email] Password Reset for ${to}`);
    console.log(`Token: ${token}`);
    console.log('================================\n');

    let transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    const info = await transporter.sendMail({
        from: '"SwarnPublication" <noreply@swarnpublication.com>',
        to,
        subject: 'Reset your password',
        text: `You requested a password reset. Click this link to reset it: ${resetUrl}`,
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #122A40;">Reset your password</h2>
        <p>You recently requested to reset your password for your SwarnPublication account. Click the button below to reset it.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0EA5A4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #666;">If you did not request a password reset, please ignore this email. This link is only valid for 1 hour.</p>
      </div>`,
    });

    if (info.messageId) {
        console.log('[Email] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
}
