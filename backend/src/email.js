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
exports.sendCourseInvite = sendCourseInvite;
exports.sendPasswordReset = sendPasswordReset;
exports.sendCourseCompleted = sendCourseCompleted;
exports.sendModuleCompleted = sendModuleCompleted;
exports.sendCourseCertificate = sendCourseCertificate;
exports.sendNewStudentNotification = sendNewStudentNotification;
exports.sendAccountCreated = sendAccountCreated;
exports.sendCustomMessage = sendCustomMessage;
const nodemailer_1 = __importDefault(require("nodemailer"));
const db_js_1 = require("./db.js");
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
/** Fetch the platform language from app_settings (defaults to 'es') */
async function getLang() {
    try {
        const row = await (0, db_js_1.queryOne)(`SELECT value FROM app_settings WHERE \`key\` = 'platformLanguage'`);
        return (row?.value || 'es').toLowerCase().slice(0, 2);
    }
    catch {
        return 'es';
    }
}
/** Simple translation map for email strings */
const t = {
    // Common
    'allRightsReserved': { es: 'Todos los derechos reservados.', en: 'All rights reserved.', fr: 'Tous droits réservés.', pt: 'Todos os direitos reservados.' },
    // Welcome
    'welcome.subject': { es: '¡Bienvenido a CXFlow Academy!', en: 'Welcome to CXFlow Academy!', fr: 'Bienvenue sur CXFlow Academy !', pt: 'Bem-vindo ao CXFlow Academy!' },
    'welcome.body': { es: '¡Bienvenido a <strong>CXFlow Academy</strong>! Tu cuenta ha sido creada exitosamente.', en: 'Welcome to <strong>CXFlow Academy</strong>! Your account has been created successfully.', fr: 'Bienvenue sur <strong>CXFlow Academy</strong> ! Votre compte a été créé avec succès.', pt: 'Bem-vindo ao <strong>CXFlow Academy</strong>! Sua conta foi criada com sucesso.' },
    'welcome.explore': { es: 'Explora nuestros cursos y comienza a aprender hoy.', en: 'Explore our courses and start learning today.', fr: 'Explorez nos cours et commencez à apprendre dès aujourd\'hui.', pt: 'Explore nossos cursos e comece a aprender hoje.' },
    'welcome.btn': { es: 'Ver Cursos', en: 'Browse Courses', fr: 'Voir les cours', pt: 'Ver Cursos' },
    'welcome.ignore': { es: 'Si no creaste esta cuenta, puedes ignorar este correo.', en: "If you didn't create this account, you can ignore this email.", fr: "Si vous n'avez pas créé ce compte, ignorez cet e-mail.", pt: 'Se não criou esta conta, pode ignorar este e-mail.' },
    // Enrollment
    'enroll.subject': { es: 'Te has inscrito en', en: "You're enrolled in", fr: 'Vous êtes inscrit à', pt: 'Você se inscreveu em' },
    'enroll.body': { es: 'Te has inscrito exitosamente en', en: "You've successfully enrolled in", fr: 'Vous êtes désormais inscrit au cours', pt: 'Você se inscreveu com sucesso em' },
    'enroll.start': { es: '¡Comienza a aprender ahora!', en: 'Start learning now!', fr: 'Commencez à apprendre maintenant !', pt: 'Comece a aprender agora!' },
    'enroll.btn': { es: 'Iniciar Curso', en: 'Start Course', fr: 'Démarrer le cours', pt: 'Iniciar Curso' },
    // Invite
    'invite.subject': { es: 'Te han invitado a unirte a', en: "You're invited to join", fr: 'Vous êtes invité à rejoindre', pt: 'Você foi convidado para se juntar a' },
    'invite.heading': { es: 'Has sido invitado', en: "You're invited", fr: 'Vous êtes invité', pt: 'Você foi convidado' },
    'invite.body1': { es: 'te invitó a inscribirte en el curso', en: 'invited you to enroll in the course', fr: "vous a invité à vous inscrire au cours", pt: 'convidou você para se inscrever no curso' },
    'invite.body2': { es: 'Haz clic en el botón para aceptar la invitación. Si ya tienes una cuenta, inicia sesión con este correo y serás inscrito automáticamente.', en: "Click the button below to accept the invite. If you already have an account, sign in with this email address and you'll be enrolled automatically.", fr: "Cliquez sur le bouton ci-dessous pour accepter l'invitation. Si vous avez déjà un compte, connectez-vous avec cette adresse e-mail.", pt: 'Clique no botão abaixo para aceitar o convite. Se já tiver uma conta, faça login com este e-mail.' },
    'invite.btn': { es: 'Aceptar Invitación', en: 'Accept Invite', fr: "Accepter l'invitation", pt: 'Aceitar Convite' },
    'invite.expire': { es: 'Este enlace de invitación expira automáticamente. Si no esperabas esto, puedes ignorar este correo.', en: "This invite link expires automatically. If you weren't expecting this, you can ignore this email.", fr: "Ce lien d'invitation expire automatiquement. Si vous ne l'attendiez pas, ignorez cet e-mail.", pt: 'Este link de convite expira automaticamente. Se não esperava isto, pode ignorar este e-mail.' },
    // Password Reset
    'reset.subject': { es: 'Restablecer tu Contraseña', en: 'Reset Your Password', fr: 'Réinitialiser votre mot de passe', pt: 'Redefinir sua Senha' },
    'reset.body': { es: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para elegir una nueva.', en: 'We received a request to reset your password. Click the button below to choose a new one.', fr: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau.', pt: 'Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para escolher uma nova.' },
    'reset.btn': { es: 'Restablecer Contraseña', en: 'Reset Password', fr: 'Réinitialiser', pt: 'Redefinir Senha' },
    'reset.expire': { es: 'Este enlace expira en 1 hora. Si no solicitaste un restablecimiento, puedes ignorar este correo.', en: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.", fr: "Ce lien expire dans 1 heure. Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail.", pt: 'Este link expira em 1 hora. Se não solicitou uma redefinição, pode ignorar este e-mail.' },
    // Course Completed
    'complete.congrats': { es: '¡Felicidades', en: 'Congratulations', fr: 'Félicitations', pt: 'Parabéns' },
    'complete.body': { es: 'Has completado el curso', en: "You've completed the course", fr: 'Vous avez terminé le cours', pt: 'Você completou o curso' },
    'complete.great': { es: '¡Excelente trabajo!', en: 'Great work!', fr: 'Excellent travail !', pt: 'Excelente trabalho!' },
    'complete.more': { es: 'Sigue aprendiendo — explora más cursos disponibles.', en: 'Keep learning — explore more available courses.', fr: "Continuez à apprendre — explorez d'autres cours.", pt: 'Continue aprendendo — explore mais cursos disponíveis.' },
    'complete.btn': { es: 'Ver más Cursos', en: 'Browse More Courses', fr: 'Voir plus de cours', pt: 'Ver mais Cursos' },
    // Module Completed
    'module.done': { es: '¡Bien hecho', en: 'Well done', fr: 'Bien joué', pt: 'Muito bem' },
    'module.body': { es: 'Has completado el módulo', en: "You've completed the module", fr: 'Vous avez terminé le module', pt: 'Você completou o módulo' },
    'module.ofCourse': { es: 'del curso', en: 'of the course', fr: 'du cours', pt: 'do curso' },
    'module.keep': { es: '¡Continúa así! Sigue avanzando con el siguiente módulo.', en: 'Keep it up! Continue with the next module.', fr: 'Continuez comme ça ! Passez au module suivant.', pt: 'Continue assim! Siga para o próximo módulo.' },
    'module.btn': { es: 'Continuar Curso', en: 'Continue Course', fr: 'Continuer le cours', pt: 'Continuar Curso' },
    // New Student Notification (to creator)
    'newStudent.subject': { es: 'Nueva inscripción en', en: 'New enrollment in', fr: 'Nouvelle inscription à', pt: 'Nova inscrição em' },
    'newStudent.body': { es: 'se ha inscrito en tu curso', en: 'just enrolled in your course', fr: "vient de s'inscrire à votre cours", pt: 'acabou de se inscrever no seu curso' },
    'newStudent.btn': { es: 'Ver Analíticas', en: 'View Analytics', fr: 'Voir les analyses', pt: 'Ver Análises' },
    'newStudent.fallback': { es: 'Un nuevo estudiante', en: 'A new student', fr: 'Un nouvel étudiant', pt: 'Um novo estudante' },
    // Account Created
    'account.subject': { es: 'Tu cuenta de CXFlow Academy', en: 'Your CXFlow Academy Account', fr: 'Votre compte CXFlow Academy', pt: 'Sua conta CXFlow Academy' },
    'account.body': { es: 'Se ha creado una cuenta para ti en <strong>CXFlow Academy</strong>.', en: 'An account has been created for you on <strong>CXFlow Academy</strong>.', fr: 'Un compte a été créé pour vous sur <strong>CXFlow Academy</strong>.', pt: 'Uma conta foi criada para você no <strong>CXFlow Academy</strong>.' },
    'account.creds': { es: 'Tus credenciales de acceso', en: 'Your login credentials', fr: 'Vos identifiants de connexion', pt: 'Suas credenciais de acesso' },
    'account.email': { es: 'Correo', en: 'Email', fr: 'E-mail', pt: 'E-mail' },
    'account.password': { es: 'Contraseña', en: 'Password', fr: 'Mot de passe', pt: 'Senha' },
    'account.change': { es: '⚠️ Por favor cambia tu contraseña después de iniciar sesión.', en: '⚠️ Please change your password after your first login.', fr: '⚠️ Veuillez changer votre mot de passe après votre première connexion.', pt: '⚠️ Por favor, altere sua senha após o primeiro login.' },
    'account.btn': { es: 'Iniciar Sesión', en: 'Sign In', fr: 'Se connecter', pt: 'Entrar' },
    // Greeting
    'hi': { es: 'Hola', en: 'Hi', fr: 'Bonjour', pt: 'Olá' },
    // Custom message
    'custom.btn': { es: 'Visitar CXFlow Academy', en: 'Visit CXFlow Academy', fr: 'Visiter CXFlow Academy', pt: 'Visitar CXFlow Academy' },
    // Certificate
    'cert.title': { es: 'Constancia de Finalización', en: 'Certificate of Completion', fr: "Certificat d'achèvement", pt: 'Certificado de Conclusão' },
    'cert.awardedTo': { es: 'Se otorga a', en: 'Awarded to', fr: 'Décerné à', pt: 'Concedido a' },
    'cert.forCompleting': { es: 'Por haber completado satisfactoriamente el curso', en: 'For successfully completing the course', fr: 'Pour avoir terminé avec succès le cours', pt: 'Por ter concluído com sucesso o curso' },
    'cert.date': { es: 'Fecha de finalización', en: 'Completion date', fr: "Date d'achèvement", pt: 'Data de conclusão' },
    'cert.subject': { es: 'Constancia de Finalización', en: 'Certificate of Completion', fr: "Certificat d'achèvement", pt: 'Certificado de Conclusão' },
};
function tr(key, lang) {
    const l = (lang || 'es').slice(0, 2);
    return t[key]?.[l] || t[key]?.['es'] || key;
}
// ── Shared HTML wrapper ──
function wrap(body, lang = 'es') {
    return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px">CXFlow Academy</h1>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #e5e7eb">
  <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} CXFlow Academy. ${tr('allRightsReserved', lang)}</p>
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
async function send(to, subject, html, lang = 'es') {
    try {
        await transporter.sendMail({ from: FROM, to, subject, html: wrap(html, lang) });
        console.log(`[Email] ✓ sent "${subject}" → ${to}`);
    }
    catch (err) {
        console.error(`[Email] ✗ failed "${subject}" → ${to}:`, err);
    }
}
/** Welcome email after registration */
async function sendWelcome(to, name) {
    const lang = await getLang();
    const greeting = name ? `${tr('hi', lang)} ${name},` : `${tr('hi', lang)},`;
    await send(to, tr('welcome.subject', lang), `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('welcome.body', lang)}</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('welcome.explore', lang)}</p>
    ${btnHtml(tr('welcome.btn', lang), `${FRONTEND}/courses`)}
    <p style="font-size:13px;color:#94a3b8;margin-top:20px">${tr('welcome.ignore', lang)}</p>
  `, lang);
}
/** Enrollment confirmation email */
async function sendEnrollmentConfirmation(to, name, courseTitle, courseId) {
    const lang = await getLang();
    const greeting = name ? `${tr('hi', lang)} ${name},` : `${tr('hi', lang)},`;
    await send(to, `${tr('enroll.subject', lang)} "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('enroll.body', lang)} <strong>${courseTitle}</strong>. ${tr('enroll.start', lang)}</p>
    ${btnHtml(tr('enroll.btn', lang), `${FRONTEND}/player/${courseId}`)}
  `, lang);
}
/** Course invitation email (invite link) */
async function sendCourseInvite(to, inviterName, courseTitle, inviteToken) {
    const lang = await getLang();
    const inviter = inviterName || 'CXFlow Academy';
    const link = `${FRONTEND}/invite?token=${encodeURIComponent(inviteToken)}`;
    await send(to, `${tr('invite.subject', lang)} "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${tr('invite.heading', lang)}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6"><strong>${inviter}</strong> ${tr('invite.body1', lang)} <strong>${courseTitle}</strong>.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('invite.body2', lang)}</p>
    ${btnHtml(tr('invite.btn', lang), link)}
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-top:20px">${tr('invite.expire', lang)}</p>
  `, lang);
}
/** Password reset email with token link */
async function sendPasswordReset(to, name, resetToken) {
    const lang = await getLang();
    const greeting = name ? `${tr('hi', lang)} ${name},` : `${tr('hi', lang)},`;
    const link = `${FRONTEND}/reset-password?token=${resetToken}`;
    await send(to, tr('reset.subject', lang), `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('reset.body', lang)}</p>
    ${btnHtml(tr('reset.btn', lang), link)}
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-top:20px">${tr('reset.expire', lang)}</p>
  `, lang);
}
/** Course completion congratulations */
async function sendCourseCompleted(to, name, courseTitle) {
    const lang = await getLang();
    const greeting = name ? `${tr('complete.congrats', lang)} ${name}!` : `${tr('complete.congrats', lang)}!`;
    await send(to, `${tr('complete.body', lang)} "${courseTitle}"!`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('complete.body', lang)} <strong>${courseTitle}</strong>. ${tr('complete.great', lang)}</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('complete.more', lang)}</p>
    ${btnHtml(tr('complete.btn', lang), `${FRONTEND}/courses`)}
  `, lang);
}
/** Module completion notification */
async function sendModuleCompleted(to, name, moduleTitle, courseTitle, courseId) {
    const lang = await getLang();
    const greeting = name ? `${tr('module.done', lang)} ${name}!` : `${tr('module.done', lang)}!`;
    await send(to, `${tr('module.body', lang)}: "${moduleTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('module.body', lang)} <strong>${moduleTitle}</strong> ${tr('module.ofCourse', lang)} <strong>${courseTitle}</strong>.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('module.keep', lang)}</p>
    ${btnHtml(tr('module.btn', lang), `${FRONTEND}/player/${courseId}`)}
  `, lang);
}
/** Certificate / Constancia email — formal PDF-like HTML certificate */
async function sendCourseCertificate(to, name, courseTitle, completedDate) {
    const lang = await getLang();
    const displayName = name || to;
    const locale = lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : lang === 'pt' ? 'pt-BR' : 'es-MX';
    const formattedDate = new Date(completedDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    // Do NOT use the standard wrap() — this is a full standalone certificate
    const certificateHtml = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
  <p style="margin:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:4px;font-family:-apple-system,sans-serif">${tr('cert.title', lang)}</p>
  <div style="width:80px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin:16px auto"></div>
</td></tr>

<!-- "Se otorga a" -->
<tr><td style="padding:16px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b;font-style:italic">${tr('cert.awardedTo', lang)}</p>
</td></tr>

<!-- Student Name -->
<tr><td style="padding:0 40px;text-align:center">
  <h2 style="margin:0;font-size:32px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #daa520;display:inline-block;padding-bottom:6px">${displayName}</h2>
</td></tr>

<!-- Course info -->
<tr><td style="padding:20px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b;font-style:italic">${tr('cert.forCompleting', lang)}</p>
</td></tr>

<tr><td style="padding:8px 40px;text-align:center">
  <h3 style="margin:0;font-size:22px;font-weight:700;color:#2563eb">${courseTitle}</h3>
</td></tr>

<!-- Date -->
<tr><td style="padding:20px 40px 8px;text-align:center">
  <p style="margin:0;font-size:14px;color:#64748b">${tr('cert.date', lang)}: <strong style="color:#1e293b">${formattedDate}</strong></p>
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
  <p style="margin:0;font-size:11px;color:#9ca3af;font-family:-apple-system,sans-serif">&copy; ${new Date().getFullYear()} CXFlow Academy. ${tr('allRightsReserved', lang)}</p>
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
            subject: `${tr('cert.subject', lang)} — ${courseTitle}`,
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
    const lang = await getLang();
    const greeting = creatorName ? `${tr('hi', lang)} ${creatorName},` : `${tr('hi', lang)},`;
    const student = studentName || tr('newStudent.fallback', lang);
    await send(to, `${tr('newStudent.subject', lang)} "${courseTitle}"`, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6"><strong>${student}</strong> ${tr('newStudent.body', lang)} <strong>${courseTitle}</strong>.</p>
    ${btnHtml(tr('newStudent.btn', lang), `${FRONTEND}/manage-courses/${courseId}/analytics`)}
  `, lang);
}
/** Admin-created account email with temporary password */
async function sendAccountCreated(to, name, tempPassword) {
    const lang = await getLang();
    const greeting = name ? `${tr('hi', lang)} ${name},` : `${tr('hi', lang)},`;
    await send(to, tr('account.subject', lang), `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6">${tr('account.body', lang)}</p>
    <table style="margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:100%"><tr><td>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600">${tr('account.creds', lang)}</p>
      <p style="margin:0;font-size:15px;color:#1e293b"><strong>${tr('account.email', lang)}:</strong> ${to}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#1e293b"><strong>${tr('account.password', lang)}:</strong> ${tempPassword}</p>
    </td></tr></table>
    <p style="font-size:14px;color:#ef4444;font-weight:600">${tr('account.change', lang)}</p>
    ${btnHtml(tr('account.btn', lang), `${FRONTEND}/login`)}
  `, lang);
}
/** Admin sends a custom message to a user */
async function sendCustomMessage(to, name, subject, message) {
    const lang = await getLang();
    const greeting = name ? `${tr('hi', lang)} ${name},` : `${tr('hi', lang)},`;
    // Convert newlines to <br> for HTML
    const htmlMessage = message.replace(/\n/g, '<br>');
    await send(to, subject, `
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b">${greeting}</h2>
    <div style="font-size:15px;color:#475569;line-height:1.6">${htmlMessage}</div>
    ${btnHtml(tr('custom.btn', lang), FRONTEND)}
  `, lang);
}
exports.default = {
    sendWelcome,
    sendEnrollmentConfirmation,
    sendCourseInvite,
    sendPasswordReset,
    sendCourseCompleted,
    sendModuleCompleted,
    sendCourseCertificate,
    sendNewStudentNotification,
    sendAccountCreated,
    sendCustomMessage,
};
//# sourceMappingURL=email.js.map