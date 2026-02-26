"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Admin-only settings routes (webhook URL, etc.)
 */
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Only admin/creator can manage settings
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'CREATOR') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
// GET /settings - return all settings (admin only)
router.get('/', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const rows = await (0, db_js_1.query)('SELECT `key`, value, updatedAt FROM app_settings');
        const settings = {};
        for (const r of rows) {
            settings[r.key] = r.value;
        }
        res.json({ settings });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});
// PATCH /settings - upsert settings (admin only)
router.patch('/', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const entries = Object.entries(req.body);
        if (entries.length === 0) {
            return res.status(400).json({ error: 'No settings provided' });
        }
        const ts = (0, db_js_1.now)();
        for (const [key, value] of entries) {
            // Validate known keys
            if (!['webhookUrl'].includes(key))
                continue;
            const existing = await (0, db_js_1.queryOne)('SELECT id FROM app_settings WHERE `key` = ?', [key]);
            if (existing) {
                await (0, db_js_1.execute)('UPDATE app_settings SET value = ?, updatedAt = ? WHERE `key` = ?', [value || '', ts, key]);
            }
            else {
                await (0, db_js_1.execute)('INSERT INTO app_settings (id, `key`, value, updatedAt) VALUES (?, ?, ?, ?)', [(0, db_js_1.genId)(), key, value || '', ts]);
            }
        }
        // Return updated settings
        const rows = await (0, db_js_1.query)('SELECT `key`, value FROM app_settings');
        const settings = {};
        for (const r of rows)
            settings[r.key] = r.value;
        res.json({ settings });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// POST /settings/test-webhook - fire a test event to the webhook
router.post('/test-webhook', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const row = await (0, db_js_1.queryOne)(`SELECT value FROM app_settings WHERE \`key\` = 'webhookUrl'`);
        const url = row?.value;
        if (!url) {
            return res.status(400).json({ error: 'No webhook URL configured' });
        }
        const testPayload = {
            id: 'test_' + Date.now(),
            event: 'test.ping',
            userId: req.user.id,
            userName: req.user.name || req.user.email,
            meta: { message: 'This is a test webhook from CXFlow LMS' },
            createdAt: (0, db_js_1.now)(),
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload),
            signal: AbortSignal.timeout(10000),
        });
        res.json({
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
        });
    }
    catch (error) {
        res.json({
            success: false,
            error: error.message || 'Failed to reach webhook URL',
        });
    }
});
// POST /settings/generate-api-token - generate or regenerate API token for current user
router.post('/generate-api-token', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('UPDATE users SET apiToken = ?, updatedAt = ? WHERE id = ?', [token, ts, req.user.id]);
        res.json({ apiToken: token });
    }
    catch (error) {
        console.error('Generate API token error:', error);
        res.status(500).json({ error: 'Failed to generate API token' });
    }
});
// GET /settings/api-token - get current API token for current user
router.get('/api-token', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await (0, db_js_1.queryOne)('SELECT apiToken FROM users WHERE id = ?', [req.user.id]);
        res.json({ apiToken: user?.apiToken || null });
    }
    catch (error) {
        console.error('Get API token error:', error);
        res.status(500).json({ error: 'Failed to get API token' });
    }
});
// DELETE /settings/api-token - revoke API token
router.delete('/api-token', auth_js_1.authenticate, requireAdmin, async (req, res) => {
    try {
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('UPDATE users SET apiToken = NULL, updatedAt = ? WHERE id = ?', [ts, req.user.id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Revoke API token error:', error);
        res.status(500).json({ error: 'Failed to revoke API token' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map