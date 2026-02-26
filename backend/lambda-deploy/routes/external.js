"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * External API routes for CXflow workflow integrations.
 * Authenticated via Bearer token (stored in users.apiToken for each admin/creator).
 *
 * Usage from CXflow workflows:
 *   POST /e/external/create-learner
 *   Authorization: Bearer <token from Settings page>
 *   Content-Type: application/json
 *   {
 *     "accountid": "<creator/admin id>",     // optional — validated if provided
 *     "usrmail": "learner@example.com",
 *     "usrname": "Full Name",
 *     "suscribedcourses": ["courseId1", "courseId2"]   // optional
 *   }
 */
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("../db.js");
const email_js_1 = require("../email.js");
const activity_js_1 = require("../activity.js");
const notifications_js_1 = require("./notifications.js");
const router = (0, express_1.Router)();
async function requireBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({ error: 'Empty bearer token' });
    }
    const user = await (0, db_js_1.queryOne)("SELECT id, email, name, role FROM users WHERE apiToken = ? AND (role = 'ADMIN' OR role = 'CREATOR')", [token]);
    if (!user) {
        return res.status(403).json({ error: 'Invalid API token' });
    }
    req.account = user;
    next();
}
/**
 * POST /external/create-learner
 *
 * Creates a learner account and optionally enrols them in courses.
 *
 * Headers:
 *   Authorization: Bearer <api token from Settings>
 *
 * Body (JSON):
 *   accountid        (string, optional)  – creator/admin account ID (validated if provided)
 *   usrmail          (string, required)  – learner email
 *   usrname          (string, optional)  – learner full name
 *   suscribedcourses (string[], optional) – course IDs to auto-enrol
 *
 * Response 201 (new user) / 200 (existing user):
 *   { user, enrollments, generatedPassword? }
 */
router.post('/create-learner', requireBearerToken, async (req, res) => {
    try {
        const { accountid, usrmail, usrname, suscribedcourses } = req.body;
        const account = req.account;
        // ── Validate accountid if provided ──
        if (accountid && accountid !== account.id) {
            return res.status(403).json({ error: 'accountid does not match the authenticated account' });
        }
        // ── Validate email ──
        if (!usrmail) {
            return res.status(400).json({ error: 'usrmail is required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(usrmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // ── Check existing user ──
        const existing = await (0, db_js_1.queryOne)('SELECT id, email, name, role, createdAt FROM users WHERE email = ?', [usrmail]);
        let userId;
        let isNew = false;
        let generatedPassword;
        if (existing) {
            userId = existing.id;
        }
        else {
            // Generate random password
            const pwd = crypto_1.default.randomBytes(8).toString('base64url').slice(0, 12);
            generatedPassword = pwd;
            const hashed = await bcryptjs_1.default.hash(pwd, 10);
            userId = (0, db_js_1.genId)();
            const ts = (0, db_js_1.now)();
            isNew = true;
            await (0, db_js_1.execute)('INSERT INTO users (id, email, password, name, role, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [userId, usrmail, hashed, usrname || null, 'LEARNER', ts]);
            // Send account-created email with temp password (await so Lambda doesn't freeze)
            try {
                await (0, email_js_1.sendAccountCreated)(usrmail, usrname || null, pwd);
            }
            catch (e) {
                console.error('[External] email failed:', e);
            }
            (0, activity_js_1.logActivity)({
                event: 'user.created_by_admin',
                userId,
                userName: usrname || usrmail,
                meta: { email: usrmail, source: 'cxflow_api', createdBy: account.id },
            });
        }
        // ── Fetch user record ──
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, role, createdAt FROM users WHERE id = ?', [userId]);
        // ── Enrol in courses ──
        const enrollments = [];
        const courseIds = Array.isArray(suscribedcourses) ? suscribedcourses : [];
        for (const courseId of courseIds) {
            if (!courseId)
                continue;
            // Verify course exists & is published
            const course = await (0, db_js_1.queryOne)("SELECT id, title, creatorId FROM courses WHERE id = ? AND status = 'PUBLISHED'", [courseId]);
            if (!course) {
                enrollments.push({ courseId, status: 'not_found' });
                continue;
            }
            // Check if already enrolled
            const existingEnrollment = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [userId, courseId]);
            if (existingEnrollment) {
                enrollments.push({ courseId, status: 'already_enrolled' });
                continue;
            }
            // Create enrollment
            const enrollmentId = (0, db_js_1.genId)();
            await (0, db_js_1.execute)('INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)', [enrollmentId, userId, courseId]);
            // Notify learner
            (0, notifications_js_1.createNotification)({
                userId,
                type: 'course',
                title: 'Enrollment Confirmed',
                description: `You have been enrolled in "${course.title}".`,
                link: `/player/${courseId}`,
            });
            // Notify course creator
            if (course.creatorId) {
                (0, notifications_js_1.createNotification)({
                    userId: course.creatorId,
                    type: 'course',
                    title: 'New Student Enrolled',
                    description: `A new student was enrolled in "${course.title}" via CXflow.`,
                    link: `/manage-courses/${courseId}/analytics`,
                });
            }
            // Email learner about enrollment (await so Lambda doesn't freeze)
            try {
                await (0, email_js_1.sendEnrollmentConfirmation)(usrmail, usrname || user?.name, course.title, courseId);
            }
            catch (e) {
                console.error('[External] enrollment email failed:', e);
            }
            (0, activity_js_1.logActivity)({
                event: 'enrollment.created',
                userId,
                userName: usrname || user?.name || usrmail,
                meta: { courseId, courseTitle: course.title, source: 'cxflow_api' },
            });
            enrollments.push({ courseId, courseTitle: course.title, status: 'enrolled' });
        }
        res.status(isNew ? 201 : 200).json({
            user,
            enrollments: enrollments.length > 0 ? enrollments : undefined,
            generatedPassword: generatedPassword || undefined,
            isNew,
        });
    }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('External create-learner error:', error);
        res.status(500).json({ error: 'Failed to create learner' });
    }
});
exports.default = router;
//# sourceMappingURL=external.js.map