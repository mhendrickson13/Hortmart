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
/** Password reset email with token link */
export declare function sendPasswordReset(to: string, name: string | null, resetToken: string): Promise<void>;
/** Course completion congratulations */
export declare function sendCourseCompleted(to: string, name: string | null, courseTitle: string): Promise<void>;
/** Notify course creator when a new student enrolls */
export declare function sendNewStudentNotification(to: string, creatorName: string | null, studentName: string | null, courseTitle: string, courseId: string): Promise<void>;
/** Admin-created account email with temporary password */
export declare function sendAccountCreated(to: string, name: string | null, tempPassword: string): Promise<void>;
/** Admin sends a custom message to a user */
export declare function sendCustomMessage(to: string, name: string | null, subject: string, message: string): Promise<void>;
declare const _default: {
    sendWelcome: typeof sendWelcome;
    sendEnrollmentConfirmation: typeof sendEnrollmentConfirmation;
    sendPasswordReset: typeof sendPasswordReset;
    sendCourseCompleted: typeof sendCourseCompleted;
    sendNewStudentNotification: typeof sendNewStudentNotification;
    sendAccountCreated: typeof sendAccountCreated;
    sendCustomMessage: typeof sendCustomMessage;
};
export default _default;
//# sourceMappingURL=email.d.ts.map