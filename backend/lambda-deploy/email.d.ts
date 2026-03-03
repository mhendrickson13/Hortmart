/**
 * Email service — SendGrid SMTP via nodemailer.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, EMAIL_USER, EMAIL_PASSWORD
 *   EMAIL_FROM  (optional, defaults to noreply@cxflow.io)
 *   FRONTEND_URL (for links in emails)
 */
/** Welcome email after registration */
export declare function sendWelcome(to: string, name?: string): Promise<void>;
/** Enrollment confirmation email */
export declare function sendEnrollmentConfirmation(to: string, name: string | null, courseTitle: string, courseId: string): Promise<void>;
/** Course invitation email (invite link) — uses admin's language */
export declare function sendCourseInvite(to: string, inviterName: string | null, courseTitle: string, inviteToken: string, adminUserId?: string): Promise<void>;
/** Password reset email with token link */
export declare function sendPasswordReset(to: string, name: string | null, resetToken: string): Promise<void>;
/** Course completion congratulations */
export declare function sendCourseCompleted(to: string, name: string | null, courseTitle: string): Promise<void>;
/** Module completion notification */
export declare function sendModuleCompleted(to: string, name: string | null, moduleTitle: string, courseTitle: string, courseId: string): Promise<void>;
/** Certificate / Constancia email — formal PDF-like HTML certificate */
export declare function sendCourseCertificate(to: string, name: string | null, courseTitle: string, completedDate: string): Promise<void>;
/** Notify course creator when a new student enrolls */
export declare function sendNewStudentNotification(to: string, creatorName: string | null, studentName: string | null, courseTitle: string, courseId: string): Promise<void>;
/** Admin-created account email with temporary password — uses admin's language */
export declare function sendAccountCreated(to: string, name: string | null, tempPassword: string, adminUserId?: string): Promise<void>;
/** Admin sends a custom message to a user — uses admin's language */
export declare function sendCustomMessage(to: string, name: string | null, subject: string, message: string, adminUserId?: string): Promise<void>;
declare const _default: {
    sendWelcome: typeof sendWelcome;
    sendEnrollmentConfirmation: typeof sendEnrollmentConfirmation;
    sendCourseInvite: typeof sendCourseInvite;
    sendPasswordReset: typeof sendPasswordReset;
    sendCourseCompleted: typeof sendCourseCompleted;
    sendModuleCompleted: typeof sendModuleCompleted;
    sendCourseCertificate: typeof sendCourseCertificate;
    sendNewStudentNotification: typeof sendNewStudentNotification;
    sendAccountCreated: typeof sendAccountCreated;
    sendCustomMessage: typeof sendCustomMessage;
};
export default _default;
//# sourceMappingURL=email.d.ts.map