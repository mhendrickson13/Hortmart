"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /users - List all users (Admin only)
router.get('/', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const role = req.query.role;
        // Build WHERE clause
        const conditions = [];
        const params = [];
        if (role) {
            conditions.push('u.role = ?');
            params.push(role);
        }
        if (search) {
            conditions.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)');
            const s = `%${search.toLowerCase()}%`;
            params.push(s, s);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Count total
        const totalRow = await (0, db_js_1.queryOne)(`SELECT COUNT(*) as cnt FROM users u ${whereClause}`, params);
        const total = Number(totalRow?.cnt ?? 0);
        // Fetch page
        const users = await (0, db_js_1.query)(`SELECT u.id, u.email, u.name, u.image, u.role, u.createdAt, u.updatedAt
       FROM users u ${whereClause}
       ORDER BY u.createdAt DESC
       LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        if (users.length === 0) {
            return res.json({
                users: [],
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        }
        const userIds = users.map(u => u.id);
        const placeholders = (0, db_js_1.inPlaceholders)(userIds);
        // Counts: enrollments and courses per user
        const enrollCounts = await (0, db_js_1.query)(`SELECT userId, COUNT(*) as cnt FROM enrollments WHERE userId IN (${placeholders}) GROUP BY userId`, userIds);
        const courseCounts = await (0, db_js_1.query)(`SELECT creatorId, COUNT(*) as cnt FROM courses WHERE creatorId IN (${placeholders}) GROUP BY creatorId`, userIds);
        const enrollMap = new Map(enrollCounts.map(r => [r.userId, Number(r.cnt)]));
        const courseMap = new Map(courseCounts.map(r => [r.creatorId, Number(r.cnt)]));
        // Last activity
        const lastActivity = await (0, db_js_1.query)(`SELECT en.userId, MAX(lp.lastWatchedAt) as lastActive
       FROM enrollments en
       JOIN lesson_progress lp ON lp.enrollmentId = en.id
       WHERE en.userId IN (${placeholders}) AND lp.lastWatchedAt IS NOT NULL
       GROUP BY en.userId`, userIds);
        const activityMap = new Map(lastActivity.map(r => [r.userId, r.lastActive]));
        // Completed courses count
        const enrollmentsData = await (0, db_js_1.query)(`SELECT id as enrollmentId, userId, courseId FROM enrollments WHERE userId IN (${placeholders})`, userIds);
        const completedCountByUser = new Map();
        for (const uid of userIds)
            completedCountByUser.set(uid, 0);
        if (enrollmentsData.length > 0) {
            const courseIds = [...new Set(enrollmentsData.map(e => e.courseId))];
            const cp = (0, db_js_1.inPlaceholders)(courseIds);
            // Total lessons per course
            const lessonCounts = await (0, db_js_1.query)(`SELECT m.courseId, COUNT(l.id) as cnt FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId IN (${cp}) GROUP BY m.courseId`, courseIds);
            const totalLessonsMap = new Map(lessonCounts.map(r => [r.courseId, Number(r.cnt)]));
            const eIds = enrollmentsData.map(e => e.enrollmentId);
            const ep = (0, db_js_1.inPlaceholders)(eIds);
            const completedCounts = await (0, db_js_1.query)(`SELECT enrollmentId, COUNT(*) as cnt FROM lesson_progress WHERE enrollmentId IN (${ep}) AND completedAt IS NOT NULL GROUP BY enrollmentId`, eIds);
            const completedMap = new Map(completedCounts.map(r => [r.enrollmentId, Number(r.cnt)]));
            for (const enr of enrollmentsData) {
                const totalL = totalLessonsMap.get(enr.courseId) ?? 0;
                const completedL = completedMap.get(enr.enrollmentId) ?? 0;
                if (totalL > 0 && completedL === totalL) {
                    completedCountByUser.set(enr.userId, (completedCountByUser.get(enr.userId) ?? 0) + 1);
                }
            }
        }
        const usersWithStats = users.map(u => ({
            ...u,
            _count: { enrollments: enrollMap.get(u.id) ?? 0, courses: courseMap.get(u.id) ?? 0 },
            lastActiveAt: activityMap.get(u.id) ?? u.updatedAt ?? u.createdAt,
            completedCoursesCount: completedCountByUser.get(u.id) ?? 0,
        }));
        res.json({
            users: usersWithStats,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});
// GET /users/profile
router.get('/profile', auth_js_1.authenticate, async (req, res) => {
    try {
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, bio, role, createdAt, updatedAt FROM users WHERE id = ?', [req.user.id]);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const counts = await (0, db_js_1.queryOne)(`SELECT
        (SELECT COUNT(*) FROM enrollments WHERE userId = ?) as enrollments,
        (SELECT COUNT(*) FROM courses WHERE creatorId = ?) as courses,
        (SELECT COUNT(*) FROM reviews WHERE userId = ?) as reviews`, [req.user.id, req.user.id, req.user.id]);
        res.json({
            user: {
                ...user,
                _count: {
                    enrollments: Number(counts?.enrollments ?? 0),
                    courses: Number(counts?.courses ?? 0),
                    reviews: Number(counts?.reviews ?? 0),
                },
            },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
// GET /users/profile/enrollments
router.get('/profile/enrollments', auth_js_1.authenticate, async (req, res) => {
    try {
        const enrollments = await (0, db_js_1.query)(`SELECT e.*, c.id as c_id, c.title, c.subtitle, c.coverImage, c.price, c.level, c.category,
              u.id as cr_id, u.name as cr_name, u.image as cr_image
       FROM enrollments e
       JOIN courses c ON e.courseId = c.id AND c.status = 'PUBLISHED'
       LEFT JOIN users u ON c.creatorId = u.id
       WHERE e.userId = ?
       ORDER BY e.enrolledAt DESC`, [req.user.id]);
        // Enrich each enrollment with modules/lessons/progress
        const result = [];
        for (const enr of enrollments) {
            const modules = await (0, db_js_1.query)('SELECT m.id, l.id as lessonId, l.durationSeconds FROM modules m LEFT JOIN lessons l ON l.moduleId = m.id WHERE m.courseId = ?', [enr.courseId]);
            const lessonProgress = await (0, db_js_1.query)('SELECT * FROM lesson_progress WHERE enrollmentId = ?', [enr.id]);
            result.push({
                id: enr.id, userId: enr.userId, courseId: enr.courseId, enrolledAt: enr.enrolledAt,
                course: {
                    id: enr.c_id, title: enr.title, subtitle: enr.subtitle, coverImage: enr.coverImage,
                    price: enr.price, level: enr.level, category: enr.category,
                    creator: { id: enr.cr_id, name: enr.cr_name, image: enr.cr_image },
                    modules: groupModulesWithLessons(modules),
                },
                lessonProgress,
            });
        }
        res.json({ enrollments: result });
    }
    catch (error) {
        console.error('Get profile enrollments error:', error);
        res.status(500).json({ error: 'Failed to get enrollments' });
    }
});
// Helper to group flat module/lesson rows
function groupModulesWithLessons(rows) {
    const moduleMap = new Map();
    for (const r of rows) {
        if (!moduleMap.has(r.id)) {
            moduleMap.set(r.id, { id: r.id, lessons: [] });
        }
        if (r.lessonId) {
            moduleMap.get(r.id).lessons.push({ id: r.lessonId, durationSeconds: r.durationSeconds ?? 0 });
        }
    }
    return [...moduleMap.values()];
}
// PATCH /users/profile
router.patch('/profile', auth_js_1.authenticate, async (req, res) => {
    try {
        const { name, bio, image, role } = req.body;
        const sets = [];
        const params = [];
        if (name !== undefined) {
            sets.push('name = ?');
            params.push(name);
        }
        if (bio !== undefined) {
            sets.push('bio = ?');
            params.push(bio);
        }
        if (image !== undefined) {
            sets.push('image = ?');
            params.push(image);
        }
        if (role !== undefined && req.user.role === 'ADMIN') {
            sets.push('role = ?');
            params.push(role);
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(req.user.id);
        await (0, db_js_1.execute)(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, bio, role, updatedAt FROM users WHERE id = ?', [req.user.id]);
        res.json({ user });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// PATCH /users/password
router.patch('/password', auth_js_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Valid currentPassword and newPassword (min 6 chars) required' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (!user || !user.password) {
            return res.status(400).json({ error: 'Cannot change password' });
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await (0, db_js_1.execute)('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [hashed, (0, db_js_1.now)(), req.user.id]);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// GET /users/:id
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, bio, role, emailVerified, blockedAt, createdAt, updatedAt FROM users WHERE id = ?', [id]);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const counts = await (0, db_js_1.queryOne)(`SELECT
        (SELECT COUNT(*) FROM enrollments WHERE userId = ?) as enrollments,
        (SELECT COUNT(*) FROM courses WHERE creatorId = ?) as courses,
        (SELECT COUNT(*) FROM reviews WHERE userId = ?) as reviews`, [id, id, id]);
        // Last activity
        const lastActive = await (0, db_js_1.queryOne)(`SELECT MAX(lp.lastWatchedAt) as lastActive
       FROM enrollments en JOIN lesson_progress lp ON lp.enrollmentId = en.id
       WHERE en.userId = ? AND lp.lastWatchedAt IS NOT NULL`, [id]);
        res.json({
            user: {
                ...user,
                _count: {
                    enrollments: Number(counts?.enrollments ?? 0),
                    courses: Number(counts?.courses ?? 0),
                    reviews: Number(counts?.reviews ?? 0),
                },
                lastActiveAt: lastActive?.lastActive ?? user.updatedAt,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
// PATCH /users/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { name, bio, image, role } = req.body;
        const sets = [];
        const params = [];
        if (name !== undefined) {
            sets.push('name = ?');
            params.push(name);
        }
        if (bio !== undefined) {
            sets.push('bio = ?');
            params.push(bio);
        }
        if (image !== undefined) {
            sets.push('image = ?');
            params.push(image);
        }
        if (role !== undefined && req.user.role === 'ADMIN') {
            sets.push('role = ?');
            params.push(role);
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, bio, role, updatedAt FROM users WHERE id = ?', [id]);
        res.json({ user });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// DELETE /users/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Cascade: delete all user data before deleting user
        const userEnrollments = await (0, db_js_1.query)('SELECT id FROM enrollments WHERE userId = ?', [id]);
        for (const enr of userEnrollments) {
            await (0, db_js_1.execute)('DELETE FROM lesson_progress WHERE enrollmentId = ?', [enr.id]);
        }
        await (0, db_js_1.execute)('DELETE FROM enrollments WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM reviews WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM notes WHERE userId = ?', [id]);
        const userQuestions = await (0, db_js_1.query)('SELECT id FROM questions WHERE userId = ?', [id]);
        for (const q of userQuestions) {
            await (0, db_js_1.execute)('DELETE FROM answers WHERE questionId = ?', [q.id]);
        }
        await (0, db_js_1.execute)('DELETE FROM questions WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM answers WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM notifications WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM user_course_saves WHERE userId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// GET /users/:id/enrollments
router.get('/:id/enrollments', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const enrollments = await (0, db_js_1.query)(`SELECT e.*, c.id as c_id, c.title as c_title, c.coverImage, c.price,
              u.name as cr_name
       FROM enrollments e
       JOIN courses c ON e.courseId = c.id
       LEFT JOIN users u ON c.creatorId = u.id
       WHERE e.userId = ?
       ORDER BY e.enrolledAt DESC`, [id]);
        const result = [];
        for (const enr of enrollments) {
            // Lesson counts
            const lessonRows = await (0, db_js_1.query)('SELECT l.id FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId = ?', [enr.courseId]);
            const totalLessons = lessonRows.length;
            const progressRows = await (0, db_js_1.query)('SELECT * FROM lesson_progress WHERE enrollmentId = ?', [enr.id]);
            const completedLessons = progressRows.filter(lp => lp.completedAt != null).length;
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            const lastActivityAt = progressRows.reduce((max, lp) => {
                const d = lp.lastWatchedAt ?? lp.completedAt ?? lp.updatedAt;
                if (!d)
                    return max;
                const dStr = d instanceof Date ? d.toISOString() : String(d);
                const maxStr = max instanceof Date ? max.toISOString() : max ? String(max) : null;
                return !maxStr || dStr > maxStr ? d : max;
            }, null);
            result.push({
                id: enr.id,
                courseId: enr.c_id,
                courseTitle: enr.c_title,
                coursePrice: enr.price ?? 0,
                enrolledAt: enr.enrolledAt,
                totalLessons,
                completedLessons,
                progressPercent: Math.round(progress * 10) / 10,
                lastActivityAt: lastActivityAt ? (lastActivityAt instanceof Date ? lastActivityAt.toISOString() : String(lastActivityAt)) : null,
                isCompleted: totalLessons > 0 && completedLessons === totalLessons,
                course: {
                    id: enr.c_id,
                    title: enr.c_title,
                    coverImage: enr.coverImage,
                    creator: { name: enr.cr_name },
                },
                progress: Math.round(progress * 10) / 10,
            });
        }
        res.json({ enrollments: result });
    }
    catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({ error: 'Failed to get enrollments' });
    }
});
// POST /users - Create user (Admin only)
router.post('/', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Valid email and password (min 6 chars) required' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const id = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        try {
            await (0, db_js_1.execute)('INSERT INTO users (id, email, password, name, role, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [id, email, hashed, name || null, role || 'LEARNER', ts]);
        }
        catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Email already exists' });
            }
            throw e;
        }
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, role, createdAt FROM users WHERE id = ?', [id]);
        res.status(201).json({ user });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
// POST /users/:id/block
router.post('/:id/block', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM users WHERE id = ?', [userId]);
        if (!existing)
            return res.status(404).json({ error: 'User not found' });
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('UPDATE users SET blockedAt = ?, updatedAt = ? WHERE id = ?', [ts, ts, userId]);
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, role, blockedAt FROM users WHERE id = ?', [userId]);
        res.json({ user, message: 'User blocked successfully' });
    }
    catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
});
// POST /users/:id/unblock
router.post('/:id/unblock', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM users WHERE id = ?', [userId]);
        if (!existing)
            return res.status(404).json({ error: 'User not found' });
        await (0, db_js_1.execute)('UPDATE users SET blockedAt = NULL, updatedAt = ? WHERE id = ?', [(0, db_js_1.now)(), userId]);
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, role, blockedAt FROM users WHERE id = ?', [userId]);
        res.json({ user, message: 'User unblocked successfully' });
    }
    catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map