"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /notifications - List user's notifications
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const notifications = await (0, db_js_1.query)(`SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`, [req.user.id, limit]);
        const unreadRow = await (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = false', [req.user.id]);
        // Convert boolean
        notifications.forEach(n => { n.isRead = !!n.isRead; });
        res.json({
            notifications,
            unreadCount: Number(unreadRow?.cnt ?? 0),
        });
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});
// GET /notifications/unread-count - Quick count for badge
router.get('/unread-count', auth_js_1.authenticate, async (req, res) => {
    try {
        const row = await (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = false', [req.user.id]);
        res.json({ count: Number(row?.cnt ?? 0) });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});
// PATCH /notifications/read-all - Mark all as read
router.patch('/read-all', auth_js_1.authenticate, async (req, res) => {
    try {
        await (0, db_js_1.execute)('UPDATE notifications SET isRead = true WHERE userId = ? AND isRead = false', [req.user.id]);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});
// PATCH /notifications/:id/read - Mark one as read
router.patch('/:id/read', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await (0, db_js_1.execute)('UPDATE notifications SET isRead = true WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});
// DELETE /notifications/:id - Delete one notification
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await (0, db_js_1.execute)('DELETE FROM notifications WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.json({ message: 'Notification deleted' });
    }
    catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});
// ── Helper: create a notification (called from other routes) ──
async function createNotification(params) {
    try {
        // Check if user has in-app notifications enabled
        const userPref = await (0, db_js_1.queryOne)('SELECT notifyInApp FROM users WHERE id = ?', [params.userId]);
        if (userPref && !userPref.notifyInApp)
            return; // User disabled in-app notifications
        const id = (0, db_js_1.genId)();
        await (0, db_js_1.execute)(`INSERT INTO notifications (id, userId, type, title, description, link, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, false, NOW(3))`, [id, params.userId, params.type, params.title, params.description, params.link || null]);
    }
    catch (e) {
        // Non-critical: don't break the parent operation
        console.error('Failed to create notification:', e);
    }
}
exports.default = router;
//# sourceMappingURL=notifications.js.map