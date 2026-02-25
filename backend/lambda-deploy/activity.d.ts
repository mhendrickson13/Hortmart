export type ActivityEvent = 'user.registered' | 'user.login' | 'user.blocked' | 'user.unblocked' | 'enrollment.created' | 'lesson.started' | 'lesson.completed' | 'course.completed' | 'review.created' | 'user.created_by_admin';
export interface ActivityPayload {
    event: ActivityEvent;
    userId: string;
    /** Human‑readable name or email (for display) */
    userName?: string | null;
    /** Related entity IDs (courseId, lessonId, etc.) */
    meta?: Record<string, any>;
}
/**
 * Log an activity event *and* fire the webhook (fire-and-forget).
 * Never throws — failures are logged to console.
 */
export declare function logActivity(payload: ActivityPayload): Promise<void>;
/**
 * Fire a payload to the configured webhook URL (fire-and-forget).
 */
export declare function fireWebhook(body: Record<string, any>): Promise<void>;
//# sourceMappingURL=activity.d.ts.map