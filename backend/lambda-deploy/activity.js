"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
/**
 * Activity logging + webhook dispatch.
 * Every logged event is persisted in `activity_log` and optionally
 * sent to a configured webhook URL.
 */
const db_js_1 = require("./db.js");
/**
 * Log an activity event *and* fire the webhook (fire-and-forget).
 * Never throws — failures are logged to console.
 */
async function logActivity(payload) {
    const { event, userId, userName, meta } = payload;
    const id = (0, db_js_1.genId)();
    const ts = (0, db_js_1.now)();
    const metaJson = meta ? JSON.stringify(meta) : null;
    // 1. Persist
    try {
        await (0, db_js_1.execute)(`INSERT INTO activity_log (id, event, userId, userName, meta, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`, [id, event, userId, userName || null, metaJson, ts]);
    }
    catch (e) {
        console.error('[Activity] insert error:', e);
    }
    // 2. Webhook (fire-and-forget)
    fireWebhook({ id, event, userId, userName, meta, createdAt: ts }).catch(() => { });
}
/** Send payload to the configured webhook URL, if any. */
async function fireWebhook(body) {
    try {
        const row = await (0, db_js_1.queryOne)(`SELECT value FROM app_settings WHERE \`key\` = 'webhookUrl'`);
        const url = row?.value;
        if (!url)
            return; // no webhook configured
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000), // 5 s timeout
        });
        if (!res.ok) {
            console.warn(`[Webhook] ${res.status} from ${url}`);
        }
    }
    catch (e) {
        console.warn('[Webhook] fire error:', e);
    }
}
//# sourceMappingURL=activity.js.map