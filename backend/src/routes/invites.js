"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// POST /invites/accept
// Body: { token: string }
// Requires authentication; the logged-in user's email must match the invite email.
router.post('/accept', auth_js_1.authenticate, async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        if (!token)
            return res.status(400).json({ error: 'token is required' });
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch {
            return res.status(400).json({ error: 'Invalid or expired invite token' });
        }
        if (payload.type !== 'course_invite' || !payload.courseId || !payload.email) {
            return res.status(400).json({ error: 'Invalid invite token' });
        }
        const inviteEmail = String(payload.email).toLowerCase();
        const userEmail = String(req.user.email).toLowerCase();
        if (inviteEmail !== userEmail) {
            return res.status(403).json({ error: 'This invite was sent to a different email address' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT id, title, status FROM courses WHERE id = ?', [payload.courseId]);
        if (!course || course.status !== 'PUBLISHED') {
            return res.status(404).json({ error: 'Course not found' });
        }
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, payload.courseId]);
        if (!existing) {
            await (0, db_js_1.execute)('INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)', [(0, db_js_1.genId)(), req.user.id, payload.courseId]);
        }
        res.json({
            success: true,
            courseId: payload.courseId,
            courseTitle: course.title,
            enrolled: true,
            alreadyEnrolled: !!existing,
        });
    }
    catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
});
exports.default = router;
//# sourceMappingURL=invites.js.map