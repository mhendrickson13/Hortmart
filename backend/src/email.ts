/**
 * Email service — SendGrid SMTP via nodemailer.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, EMAIL_USER, EMAIL_PASSWORD
 *   EMAIL_FROM  (optional, defaults to noreply@cxflow.io)
 *   FRONTEND_URL (for links in emails)
 */

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'apikey',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

const FROM = process.env.EMAIL_FROM || 'CXFlow Academy <noreply@cxflow.io>';
const FRONTEND = process.env.FRONTEND_URL || 'https://lms.cxflow.io';

// ── Shared HTML wrapper ──

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px">CXFlow Academy</h1>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #e5e7eb">
  <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} CXFlow Academy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function btnHtml(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px auto"><tr><td>
<a href="${href}" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px">${text}</a>
</td></tr></table>`;
}

// ── Public API ──

async function send(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html: wrap(html) });
    console.log(`[Email] ✓ sent "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[Email] ✗ failed "${subject}" → ${to}:`, err);
  }
}

/** Welcome email after registration */
export async function sendWelcome(to: string, name?: string) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  await send(to, 'Welcome to CXFlow Academy!', `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">Welcome to <strong>CXFlow Academy</strong>! Your account has been created successfully.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">Explore our courses and start learning today.</p>
    ${btnHtml('Browse Courses', `${FRONTEND}/courses`)}
    <p style="font-size:13px;color:#94a3b8;margin-top:20px">If you didn't create this account, you can ignore this email.</p>
  `);
}

/** Enrollment confirmation email */
export async function sendEnrollmentConfirmation(to: string, name: string | null, courseTitle: string, courseId: string) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  await send(to, `You're enrolled in "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">You've successfully enrolled in <strong>${courseTitle}</strong>. Start learning now!</p>
    ${btnHtml('Start Course', `${FRONTEND}/player/${courseId}`)}
  `);
}

/** Password reset email with token link */
export async function sendPasswordReset(to: string, name: string | null, resetToken: string) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const link = `${FRONTEND}/reset-password?token=${resetToken}`;
  await send(to, 'Reset Your Password', `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">We received a request to reset your password. Click the button below to choose a new one.</p>
    ${btnHtml('Reset Password', link)}
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-top:20px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  `);
}

/** Course completion congratulations */
export async function sendCourseCompleted(to: string, name: string | null, courseTitle: string) {
  const greeting = name ? `Congratulations ${name}!` : 'Congratulations!';
  await send(to, `You completed "${courseTitle}"!`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">You've completed <strong>${courseTitle}</strong>. Great job!</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">Keep up the momentum — explore more courses.</p>
    ${btnHtml('Browse More Courses', `${FRONTEND}/courses`)}
  `);
}

/** Notify course creator when a new student enrolls */
export async function sendNewStudentNotification(to: string, creatorName: string | null, studentName: string | null, courseTitle: string, courseId: string) {
  const greeting = creatorName ? `Hi ${creatorName},` : 'Hi,';
  const student = studentName || 'A new student';
  await send(to, `New enrollment in "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6"><strong>${student}</strong> just enrolled in your course <strong>${courseTitle}</strong>.</p>
    ${btnHtml('View Analytics', `${FRONTEND}/manage-courses/${courseId}/analytics`)}
  `);
}

/** Admin-created account email with temporary password */
export async function sendAccountCreated(to: string, name: string | null, tempPassword: string) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  await send(to, 'Your CXFlow Academy Account', `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">An account has been created for you on <strong>CXFlow Academy</strong>.</p>
    <table style="margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:100%"><tr><td>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600">Your login credentials</p>
      <p style="margin:0;font-size:15px;color:#1e293b"><strong>Email:</strong> ${to}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#1e293b"><strong>Password:</strong> ${tempPassword}</p>
    </td></tr></table>
    <p style="font-size:14px;color:#ef4444;font-weight:600">⚠️ Please change your password after your first login.</p>
    ${btnHtml('Sign In', `${FRONTEND}/login`)}
  `);
}

/** Admin sends a custom message to a user */
export async function sendCustomMessage(to: string, name: string | null, subject: string, message: string) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  // Convert newlines to <br> for HTML
  const htmlMessage = message.replace(/\n/g, '<br>');
  await send(to, subject, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <div style="font-size:15px;color:#475569;line-height:1.6">${htmlMessage}</div>
    ${btnHtml('Visit CXFlow Academy', FRONTEND)}
  `);
}

export default {
  sendWelcome,
  sendEnrollmentConfirmation,
  sendPasswordReset,
  sendCourseCompleted,
  sendNewStudentNotification,
  sendAccountCreated,
  sendCustomMessage,
};
