/**
 * Activity logging + webhook dispatch.
 * Every logged event is persisted in `activity_log` and optionally
 * sent to a configured webhook URL.
 */
import { query, queryOne, execute, genId, now } from './db.js';

export type ActivityEvent =
  | 'user.registered'
  | 'user.login'
  | 'user.blocked'
  | 'user.unblocked'
  | 'enrollment.created'
  | 'lesson.started'
  | 'lesson.completed'
  | 'course.completed'
  | 'review.created'
  | 'user.created_by_admin';

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
export async function logActivity(payload: ActivityPayload): Promise<void> {
  const { event, userId, userName, meta } = payload;
  const id = genId();
  const ts = now();
  const metaJson = meta ? JSON.stringify(meta) : null;

  // 1. Persist
  try {
    await execute(
      `INSERT INTO activity_log (id, event, userId, userName, meta, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, event, userId, userName || null, metaJson, ts],
    );
  } catch (e) {
    console.error('[Activity] insert error:', e);
  }

  // Webhook dispatch is handled by the video-event endpoint only
}

/**
 * Fire a payload to the configured webhook URL (fire-and-forget).
 */
export async function fireWebhook(body: Record<string, any>): Promise<void> {
  try {
    const row = await queryOne<any>(
      `SELECT value FROM app_settings WHERE \`key\` = 'webhookUrl'`,
    );
    const url = row?.value;
    if (!url) return; // no webhook configured

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000), // 5 s timeout
    });

    if (!res.ok) {
      console.warn(`[Webhook] ${res.status} from ${url}`);
    }
  } catch (e) {
    console.warn('[Webhook] fire error:', e);
  }
}
