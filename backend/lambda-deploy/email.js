"use strict";
/**
 * Email service — SendGrid SMTP via nodemailer.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, EMAIL_USER, EMAIL_PASSWORD
 *   EMAIL_FROM  (optional, defaults to noreply@cxflow.io)
 *   FRONTEND_URL (for links in emails)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcome = sendWelcome;
exports.sendEnrollmentConfirmation = sendEnrollmentConfirmation;
exports.sendPasswordReset = sendPasswordReset;
exports.sendCourseCompleted = sendCourseCompleted;
exports.sendModuleCompleted = sendModuleCompleted;
exports.sendCourseCertificate = sendCourseCertificate;
exports.sendNewStudentNotification = sendNewStudentNotification;
exports.sendAccountCreated = sendAccountCreated;
exports.sendCustomMessage = sendCustomMessage;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
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
function wrap(body) {
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
function btnHtml(text, href) {
    return `<table cellpadding="0" cellspacing="0" style="margin:24px auto"><tr><td>
<a href="${href}" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px">${text}</a>
</td></tr></table>`;
}
// ── Public API ──
async function send(to, subject, html) {
    try {
        await transporter.sendMail({ from: FROM, to, subject, html: wrap(html) });
        console.log(`[Email] ✓ sent "${subject}" → ${to}`);
    }
    catch (err) {
        console.error(`[Email] ✗ failed "${subject}" → ${to}:`, err);
    }
}
/** Welcome email after registration */
async function sendWelcome(to, name) {
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
async function sendEnrollmentConfirmation(to, name, courseTitle, courseId) {
    const greeting = name ? `Hi ${name},` : 'Hi,';
    await send(to, `You're enrolled in "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">You've successfully enrolled in <strong>${courseTitle}</strong>. Start learning now!</p>
    ${btnHtml('Start Course', `${FRONTEND}/player/${courseId}`)}
  `);
}
/** Password reset email with token link */
async function sendPasswordReset(to, name, resetToken) {
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
async function sendCourseCompleted(to, name, courseTitle) {
    const greeting = name ? `¡Felicidades ${name}!` : '¡Felicidades!';
    await send(to, `Has completado "${courseTitle}"!`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">Has completado el curso <strong>${courseTitle}</strong>. ¡Excelente trabajo!</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">Sigue aprendiendo — explora más cursos disponibles.</p>
    ${btnHtml('Ver más Cursos', `${FRONTEND}/courses`)}
  `);
}
/** Module completion notification */
async function sendModuleCompleted(to, name, moduleTitle, courseTitle, courseId) {
    const greeting = name ? `¡Bien hecho ${name}!` : '¡Bien hecho!';
    await send(to, `Módulo completado: "${moduleTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">Has completado el módulo <strong>${moduleTitle}</strong> del curso <strong>${courseTitle}</strong>.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">¡Continúa así! Sigue avanzando con el siguiente módulo.</p>
    ${btnHtml('Continuar Curso', `${FRONTEND}/player/${courseId}`)}
  `);
}
/** Certificate / Constancia email — formal PDF-like HTML certificate */
async function sendCourseCertificate(to, name, courseTitle, completedDate) {
    const displayName = name || to;
    const formattedDate = new Date(completedDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    // Do NOT use the standard wrap() — this is a full standalone certificate
    const certificateHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Georgia','Times New Roman',serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0">
<tr><td align="center">

<!-- Certificate Card -->
<table width="650" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

<!-- Gold Header Bar -->
<tr><td style="background:linear-gradient(135deg,#b8860b,#daa520,#b8860b);padding:6px 0"></td></tr>

<!-- Logo Section -->
<tr><td style="padding:32px 40px 16px;text-align:center">
  <h1 style="margin:0;font-size:26px;font-weight:800;color:#1e293b;letter-spacing:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">CXFlow Academy</h1>
</td></tr>

<!-- Certificate Title -->
<tr><td style="padding:0 40px;text-align:center">
  <p style="margin:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:4px;font-family:-apple-system,sans-serif">Constancia de Finalización</p>
  <div style="width:80px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin:16px auto"></div>
</td></tr>

<!-- "Se otorga a" -->
<tr><td style="padding:16px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b;font-style:italic">Se otorga a</p>
</td></tr>

<!-- Student Name -->
<tr><td style="padding:0 40px;text-align:center">
  <h2 style="margin:0;font-size:32px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #daa520;display:inline-block;padding-bottom:6px">${displayName}</h2>
</td></tr>

<!-- Course info -->
<tr><td style="padding:20px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b;font-style:italic">Por haber completado satisfactoriamente el curso</p>
</td></tr>

<tr><td style="padding:8px 40px;text-align:center">
  <h3 style="margin:0;font-size:22px;font-weight:700;color:#2563eb">${courseTitle}</h3>
</td></tr>

<!-- Date -->
<tr><td style="padding:20px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b">Fecha de finalización: <strong style="color:#1e293b">${formattedDate}</strong></p>
</td></tr>

<!-- Seal / Badge -->
<tr><td style="padding:24px 40px;text-align:center">
  <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#daa520,#f5d76e,#daa520);box-shadow:0 2px 12px rgba(218,165,32,.3);line-height:80px;text-align:center">
    <span style="font-size:36px">🏆</span>
  </div>
</td></tr>

<!-- Gold Footer Bar -->
<tr><td style="background:linear-gradient(135deg,#b8860b,#daa520,#b8860b);padding:6px 0"></td></tr>

<!-- Footer -->
<tr><td style="padding:16px 40px 24px;text-align:center;background:#fafafa">
  <p style="margin:0;font-size:11px;color:#9ca3af;font-family:-apple-system,sans-serif">&copy; ${new Date().getFullYear()} CXFlow Academy. Todos los derechos reservados.</p>
</td></tr>

</table>
<!-- End Certificate Card -->

</td></tr>
</table>
</body></html>`;
    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: `Constancia de Finalización — ${courseTitle}`,
            html: certificateHtml,
        });
        console.log(`[Email] ✓ sent certificate "${courseTitle}" → ${to}`);
    }
    catch (err) {
        console.error(`[Email] ✗ failed certificate "${courseTitle}" → ${to}:`, err);
    }
}
/** Notify course creator when a new student enrolls */
async function sendNewStudentNotification(to, creatorName, studentName, courseTitle, courseId) {
    const greeting = creatorName ? `Hi ${creatorName},` : 'Hi,';
    const student = studentName || 'A new student';
    await send(to, `New enrollment in "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6"><strong>${student}</strong> just enrolled in your course <strong>${courseTitle}</strong>.</p>
    ${btnHtml('View Analytics', `${FRONTEND}/manage-courses/${courseId}/analytics`)}
  `);
}
/** Admin-created account email with temporary password */
async function sendAccountCreated(to, name, tempPassword) {
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
async function sendCustomMessage(to, name, subject, message) {
    const greeting = name ? `Hi ${name},` : 'Hi,';
    // Convert newlines to <br> for HTML
    const htmlMessage = message.replace(/\n/g, '<br>');
    await send(to, subject, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <div style="font-size:15px;color:#475569;line-height:1.6">${htmlMessage}</div>
    ${btnHtml('Visit CXFlow Academy', FRONTEND)}
  `);
}
exports.default = {
    sendWelcome,
    sendEnrollmentConfirmation,
    sendPasswordReset,
    sendCourseCompleted,
    sendModuleCompleted,
    sendCourseCertificate,
    sendNewStudentNotification,
    sendAccountCreated,
    sendCustomMessage,
};
//# sourceMappingURL=email.js.map