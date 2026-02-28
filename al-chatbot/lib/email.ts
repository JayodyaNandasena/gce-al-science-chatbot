import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"A/L Science Assistant" <${EMAIL_FROM}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: #18181b; padding: 32px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">A/L Science Assistant</h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin: 0 0 12px; font-size: 20px;">Verify your email address</h2>
              <p style="color: #71717a; margin: 0 0 28px; line-height: 1.6;">
                Hi ${name || 'there'},<br><br>
                Thanks for signing up! Please verify your email address to complete your account setup.
              </p>
              <a href="${verificationUrl}" style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Verify Email Address
              </a>
              <p style="color: #a1a1aa; margin: 28px 0 0; font-size: 13px; line-height: 1.6;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #a1a1aa; margin: 12px 0 0; font-size: 12px; word-break: break-all;">
                Or copy this link: ${verificationUrl}
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"A/L Science Assistant" <${EMAIL_FROM}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: #18181b; padding: 32px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">A/L Science Assistant</h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
              <p style="color: #71717a; margin: 0 0 28px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Reset Password
              </a>
              <p style="color: #a1a1aa; margin: 28px 0 0; font-size: 13px; line-height: 1.6;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #a1a1aa; margin: 12px 0 0; font-size: 12px; word-break: break-all;">
                Or copy this link: ${resetUrl}
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
