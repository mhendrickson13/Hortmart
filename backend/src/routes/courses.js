"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const notifications_js_1 = require("./notifications.js");
const email_js_1 = require("../email.js");
const activity_js_1 = require("../activity.js");
const cache_js_1 = require("../cache.js");
const og_js_1 = require("../og.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// ── Helper: build course list with stats ──
async function enrichCourses(courseRows) {
    if (courseRows.length === 0)
        return [];
    const courseIds = courseRows.map(c => c.id);
    const ph = (0, db_js_1.inPlaceholders)(courseIds);
    // Creator info
    const creatorIds = [...new Set(courseRows.map(c => c.creatorId))];
    const crPh = (0, db_js_1.inPlaceholders)(creatorIds);
    const creators = await (0, db_js_1.query)(`SELECT id, name, image FROM users WHERE id IN (${crPh})`, creatorIds);
    const creatorMap = new Map(creators.map(u => [u.id, { id: u.id, name: u.name, image: u.image }]));
    // Module + lesson data
    const modLessons = await (0, db_js_1.query)(`SELECT m.courseId, m.id as moduleId, l.id as lessonId, l.durationSeconds
     FROM modules m LEFT JOIN lessons l ON l.moduleId = m.id
     WHERE m.courseId IN (${ph})`, courseIds);
    const moduleCountMap = new Map();
    const durationMap = new Map();
    for (const r of modLessons) {
        if (!moduleCountMap.has(r.courseId))
            moduleCountMap.set(r.courseId, new Set());
        moduleCountMap.get(r.courseId).add(r.moduleId);
        if (r.lessonId) {
            durationMap.set(r.courseId, (durationMap.get(r.courseId) ?? 0) + (r.durationSeconds ?? 0));
        }
    }
    // Enrollment counts
    const enrollCounts = await (0, db_js_1.query)(`SELECT courseId, COUNT(*) as cnt FROM enrollments WHERE courseId IN (${ph}) GROUP BY courseId`, courseIds);
    const enrollMap = new Map(enrollCounts.map(r => [r.courseId, Number(r.cnt)]));
    // Review counts + avg rating
    const reviewStats = await (0, db_js_1.query)(`SELECT courseId, COUNT(*) as cnt, AVG(rating) as avg FROM reviews WHERE courseId IN (${ph}) GROUP BY courseId`, courseIds);
    const reviewMap = new Map(reviewStats.map(r => [r.courseId, { count: Number(r.cnt), avg: Number(r.avg) }]));
    return courseRows.map(c => {
        const rs = reviewMap.get(c.id);
        return {
            id: c.id, title: c.title, subtitle: c.subtitle, description: c.description,
            coverImage: c.coverImage, price: c.price, currency: c.currency, status: c.status,
            level: c.level, category: c.category, language: c.language,
            createdAt: c.createdAt, publishedAt: c.publishedAt,
            creator: creatorMap.get(c.creatorId) ?? null,
            _count: {
                modules: moduleCountMap.get(c.id)?.size ?? 0,
                enrollments: enrollMap.get(c.id) ?? 0,
                reviews: rs?.count ?? 0,
            },
            avgRating: rs ? Math.round(rs.avg * 10) / 10 : null,
            totalDuration: durationMap.get(c.id) ?? 0,
        };
    });
}
// GET /courses
router.get('/', auth_js_1.optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const mine = req.query.mine === 'true';
        let creatorId = req.query.creatorId;
        const q = req.query.q;
        const category = req.query.category;
        const level = req.query.level;
        const priceRange = req.query.priceRange;
        const sort = req.query.sort;
        if (mine && req.user)
            creatorId = req.user.id;
        const conditions = [];
        const params = [];
        // Visibility
        if (creatorId && creatorId === req.user?.id) {
            // Creator viewing own courses - apply status filter if provided
            if (status) {
                conditions.push('c.status = ?');
                params.push(status);
            }
        }
        else if (req.user?.role === 'ADMIN') {
            // Admin can see all - apply status filter if provided
            if (status) {
                conditions.push('c.status = ?');
                params.push(status);
            }
        }
        else {
            // Everyone else sees only PUBLISHED
            conditions.push('c.status = ?');
            params.push('PUBLISHED');
        }
        if (creatorId) {
            conditions.push('c.creatorId = ?');
            params.push(creatorId);
        }
        if (category && category !== 'all') {
            conditions.push('c.category = ?');
            params.push(category);
        }
        if (level && level !== 'all') {
            conditions.push('c.level = ?');
            params.push(level);
        }
        if (priceRange && priceRange !== 'all') {
            if (priceRange === 'free') {
                conditions.push('c.price = 0');
            }
            else if (priceRange === 'paid') {
                conditions.push('c.price > 0');
            }
            else if (priceRange.includes('-')) {
                const [min, max] = priceRange.split('-').map(Number);
                conditions.push('c.price >= ? AND c.price <= ?');
                params.push(min, max);
            }
            else if (priceRange.endsWith('+')) {
                conditions.push('c.price >= ?');
                params.push(parseInt(priceRange));
            }
        }
        if (q) {
            conditions.push('(LOWER(c.title) LIKE ? OR LOWER(c.subtitle) LIKE ? OR LOWER(c.description) LIKE ?)');
            const s = `%${q.toLowerCase()}%`;
            params.push(s, s, s);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Sorting
        let orderBy = 'c.createdAt DESC';
        if (sort === 'newest')
            orderBy = 'c.createdAt DESC';
        else if (sort === 'oldest')
            orderBy = 'c.createdAt ASC';
        else if (sort === 'price-low')
            orderBy = 'c.price ASC';
        else if (sort === 'price-high')
            orderBy = 'c.price DESC';
        else if (sort === 'title')
            orderBy = 'c.title ASC';
        // Count
        const totalRow = await (0, db_js_1.queryOne)(`SELECT COUNT(*) as cnt FROM courses c ${where}`, params);
        const total = Number(totalRow?.cnt ?? 0);
        // Fetch page
        const courses = await (0, db_js_1.query)(`SELECT c.* FROM courses c ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        const enriched = await enrichCourses(courses);
        res.json({
            courses: enriched,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        console.error('List courses error:', error);
        res.status(500).json({ error: 'Failed to list courses' });
    }
});
// GET /courses/categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await (0, cache_js_1.cached)('course-categories', 300, async () => {
            const rows = await (0, db_js_1.query)('SELECT DISTINCT category FROM courses WHERE status = ? AND category IS NOT NULL', ['PUBLISHED']);
            return rows.map(r => r.category);
        });
        res.set('Cache-Control', 'public, max-age=300');
        res.json({ categories });
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});
// GET /courses/search
router.get('/search', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const q = req.query.q;
        const category = req.query.category;
        const level = req.query.level;
        const priceRange = req.query.priceRange;
        const sort = req.query.sort;
        const conditions = ['c.status = ?'];
        const params = ['PUBLISHED'];
        if (q) {
            conditions.push('(LOWER(c.title) LIKE ? OR LOWER(c.subtitle) LIKE ? OR LOWER(c.description) LIKE ?)');
            const s = `%${q.toLowerCase()}%`;
            params.push(s, s, s);
        }
        if (category) {
            conditions.push('c.category = ?');
            params.push(category);
        }
        if (level) {
            conditions.push('c.level = ?');
            params.push(level);
        }
        if (priceRange) {
            if (priceRange === 'free')
                conditions.push('c.price = 0');
            else if (priceRange === 'paid')
                conditions.push('c.price > 0');
            else if (priceRange.includes('-')) {
                const [min, max] = priceRange.split('-').map(Number);
                conditions.push('c.price >= ? AND c.price <= ?');
                params.push(min, max);
            }
            else if (priceRange.endsWith('+')) {
                conditions.push('c.price >= ?');
                params.push(parseInt(priceRange));
            }
        }
        const where = `WHERE ${conditions.join(' AND ')}`;
        let orderBy = 'c.createdAt DESC';
        if (sort === 'newest')
            orderBy = 'c.createdAt DESC';
        else if (sort === 'price-low')
            orderBy = 'c.price ASC';
        else if (sort === 'price-high')
            orderBy = 'c.price DESC';
        const totalRow = await (0, db_js_1.queryOne)(`SELECT COUNT(*) as cnt FROM courses c ${where}`, params);
        const total = Number(totalRow?.cnt ?? 0);
        const courses = await (0, db_js_1.query)(`SELECT c.* FROM courses c ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        const enriched = await enrichCourses(courses);
        res.json({
            courses: enriched,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        console.error('Search courses error:', error);
        res.status(500).json({ error: 'Failed to search courses' });
    }
});
// POST /courses
router.post('/', auth_js_1.authenticate, auth_js_1.requireCreatorOrAdmin, async (req, res) => {
    try {
        const { title, subtitle, description, whatYouWillLearn, coverImage, price, currency, level, category, language } = req.body;
        if (!title || title.length < 3)
            return res.status(400).json({ error: 'Title must be at least 3 characters' });
        const id = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)(`INSERT INTO courses (id, title, subtitle, description, whatYouWillLearn, coverImage, price, currency, status, level, category, language, creatorId, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`, [id, title, subtitle || null, description || null, whatYouWillLearn || null, coverImage || null,
            price ?? 0, currency || 'USD', level || 'ALL_LEVELS', category || null, language || 'English',
            req.user.id, ts]);
        const course = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [req.user.id]);
        res.status(201).json({ course: { ...course, creator } });
    }
    catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});
// GET /courses/:id
router.get('/:id', auth_js_1.optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.status !== 'PUBLISHED') {
            if (!req.user || (req.user.id !== course.creatorId && req.user.role !== 'ADMIN')) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image, bio FROM users WHERE id = ?', [course.creatorId]);
        // Modules with lessons and resources
        const modules = await (0, db_js_1.query)('SELECT * FROM modules WHERE courseId = ? ORDER BY position ASC', [id]);
        // Collect all lesson IDs first, then batch-fetch resources and progress
        const allModuleLessons = {};
        const allLessonIds = [];
        for (const mod of modules) {
            const lessons = await (0, db_js_1.query)('SELECT * FROM lessons WHERE moduleId = ? ORDER BY position ASC', [mod.id]);
            for (const lesson of lessons) {
                lesson.isLocked = !!lesson.isLocked;
                lesson.isFreePreview = !!lesson.isFreePreview;
                lesson.qaEnabled = lesson.qaEnabled === undefined ? true : !!lesson.qaEnabled;
                lesson.notesEnabled = lesson.notesEnabled === undefined ? true : !!lesson.notesEnabled;
                allLessonIds.push(lesson.id);
            }
            allModuleLessons[mod.id] = lessons;
        }
        // Batch fetch resources for all lessons
        let resourcesByLesson = {};
        if (allLessonIds.length > 0) {
            const placeholders = allLessonIds.map(() => '?').join(',');
            const allResources = await (0, db_js_1.query)(`SELECT * FROM resources WHERE lessonId IN (${placeholders}) ORDER BY createdAt ASC`, allLessonIds);
            for (const r of allResources) {
                if (!resourcesByLesson[r.lessonId])
                    resourcesByLesson[r.lessonId] = [];
                resourcesByLesson[r.lessonId].push(r);
            }
        }
        // Batch fetch progress for all lessons (if authenticated)
        let progressByLesson = {};
        if (req.user && allLessonIds.length > 0) {
            const placeholders = allLessonIds.map(() => '?').join(',');
            const allProgress = await (0, db_js_1.query)(`SELECT lp.lessonId, lp.progressPercent, lp.completedAt, lp.lastWatchedTimestamp FROM lesson_progress lp JOIN enrollments e ON lp.enrollmentId = e.id WHERE lp.lessonId IN (${placeholders}) AND e.userId = ? AND e.courseId = ?`, [...allLessonIds, req.user.id, id]);
            for (const p of allProgress) {
                progressByLesson[p.lessonId] = p;
            }
        }
        // Assign resources and progress to each lesson
        for (const mod of modules) {
            mod.lessons = allModuleLessons[mod.id] || [];
            for (const lesson of mod.lessons) {
                lesson.resources = resourcesByLesson[lesson.id] || [];
                if (req.user) {
                    const prog = progressByLesson[lesson.id];
                    lesson.progressPercent = prog ? Number(prog.progressPercent) : 0;
                    lesson.completedAt = prog?.completedAt || null;
                    lesson.lastWatchedTimestamp = prog ? Number(prog.lastWatchedTimestamp ?? 0) : 0;
                }
            }
        }
        // Counts
        const enrollRow = await (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?', [id]);
        const reviewRows = await (0, db_js_1.query)('SELECT rating FROM reviews WHERE courseId = ?', [id]);
        // Enrolled students (for avatar display)
        const enrolledStudents = await (0, db_js_1.query)('SELECT u.id, u.name, u.image FROM enrollments e JOIN users u ON e.userId = u.id WHERE e.courseId = ? ORDER BY e.enrolledAt DESC LIMIT 5', [id]);
        const totalLessons = modules.reduce((a, m) => a + (m.lessons?.length ?? 0), 0);
        const totalDuration = modules.reduce((a, m) => a + (m.lessons?.reduce((b, l) => b + l.durationSeconds, 0) ?? 0), 0);
        const avgRating = reviewRows.length > 0
            ? reviewRows.reduce((a, r) => a + r.rating, 0) / reviewRows.length
            : null;
        res.json({
            course: {
                ...course, creator, modules,
                _count: {
                    enrollments: Number(enrollRow?.cnt ?? 0),
                    reviews: reviewRows.length,
                    modules: modules.length,
                },
                avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
                totalDuration, totalLessons,
                enrolledStudents,
            },
        });
    }
    catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Failed to get course' });
    }
});
// PATCH /courses/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const allowedFields = ['title', 'subtitle', 'description', 'whatYouWillLearn', 'coverImage',
            'price', 'currency', 'status', 'level', 'category', 'language'];
        const sets = [];
        const params = [];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                sets.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`, params);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [updated?.creatorId]);
        // Regenerate OG page if published and metadata changed
        if (updated?.status === 'PUBLISHED') {
            const ogFields = ['title', 'subtitle', 'description', 'coverImage'];
            if (ogFields.some(f => req.body[f] !== undefined)) {
                (0, og_js_1.upsertCourseOgPage)(updated).catch(() => { });
            }
        }
        res.json({ course: { ...updated, creator } });
    }
    catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});
// DELETE /courses/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Cascade: delete all related data before deleting the course
        const courseModules = await (0, db_js_1.query)('SELECT id FROM modules WHERE courseId = ?', [id]);
        for (const mod of courseModules) {
            const modLessons = await (0, db_js_1.query)('SELECT id FROM lessons WHERE moduleId = ?', [mod.id]);
            for (const lesson of modLessons) {
                await (0, db_js_1.execute)('DELETE FROM lesson_progress WHERE lessonId = ?', [lesson.id]);
                await (0, db_js_1.execute)('DELETE FROM resources WHERE lessonId = ?', [lesson.id]);
                await (0, db_js_1.execute)('DELETE FROM notes WHERE lessonId = ?', [lesson.id]);
                const lessonQuestions = await (0, db_js_1.query)('SELECT id FROM questions WHERE lessonId = ?', [lesson.id]);
                for (const q of lessonQuestions) {
                    await (0, db_js_1.execute)('DELETE FROM answers WHERE questionId = ?', [q.id]);
                }
                await (0, db_js_1.execute)('DELETE FROM questions WHERE lessonId = ?', [lesson.id]);
            }
            await (0, db_js_1.execute)('DELETE FROM lessons WHERE moduleId = ?', [mod.id]);
        }
        await (0, db_js_1.execute)('DELETE FROM modules WHERE courseId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM enrollments WHERE courseId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM reviews WHERE courseId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM user_course_saves WHERE courseId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ message: 'Course deleted successfully' });
    }
    catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});
// POST /courses/:id/enroll
router.post('/:id/enroll', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Only learners can self-enroll. Admins/creators manage courses and should not enroll like learners.
        if (req.user?.role !== 'LEARNER') {
            return res.status(403).json({ error: 'Only learner accounts can enroll in courses' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT id, status FROM courses WHERE id = ?', [id]);
        if (!course || course.status !== 'PUBLISHED')
            return res.status(404).json({ error: 'Course not found' });
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        if (existing)
            return res.status(409).json({ error: 'Already enrolled' });
        const enrollmentId = (0, db_js_1.genId)();
        await (0, db_js_1.execute)('INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)', [enrollmentId, req.user.id, id]);
        const enrollment = await (0, db_js_1.queryOne)('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
        // Notify the learner
        (0, notifications_js_1.createNotification)({
            userId: req.user.id,
            type: 'course',
            title: 'Enrollment Confirmed',
            description: `You have successfully enrolled in a course.`,
            link: `/player/${id}`,
        });
        // Notify the course creator
        const courseInfo = await (0, db_js_1.queryOne)('SELECT creatorId, title FROM courses WHERE id = ?', [id]);
        if (courseInfo && courseInfo.creatorId !== req.user.id) {
            (0, notifications_js_1.createNotification)({
                userId: courseInfo.creatorId,
                type: 'course',
                title: 'New Student Enrolled',
                description: `A new student enrolled in "${courseInfo.title}".`,
                link: `/manage-courses/${id}/analytics`,
            });
        }
        // Send emails (fire-and-forget) — respecting user notification preferences
        const learner = await (0, db_js_1.queryOne)('SELECT name, email, notifyEmailEnrollment FROM users WHERE id = ?', [req.user.id]);
        if (learner && courseInfo) {
            if (learner.notifyEmailEnrollment) {
                (0, email_js_1.sendEnrollmentConfirmation)(learner.email, learner.name, courseInfo.title, id).catch(() => { });
            }
            // Email the course creator about new student
            if (courseInfo.creatorId !== req.user.id) {
                const creator = await (0, db_js_1.queryOne)('SELECT name, email, notifyEmailNewStudent FROM users WHERE id = ?', [courseInfo.creatorId]);
                if (creator && creator.notifyEmailNewStudent) {
                    (0, email_js_1.sendNewStudentNotification)(creator.email, creator.name, learner.name, courseInfo.title, id).catch(() => { });
                }
            }
        }
        (0, activity_js_1.logActivity)({ event: 'enrollment.created', userId: req.user.id, userName: learner?.name || req.user.email, meta: { courseId: id, courseTitle: courseInfo?.title } });
        // Webhook: course.subscription
        (0, activity_js_1.fireWebhook)({
            event: 'course.subscription',
            userId: req.user.id,
            userName: learner?.name || req.user.email,
            userEmail: learner?.email || req.user.email,
            courseId: id,
            courseName: courseInfo?.title || '',
            enrollmentId,
            timestamp: new Date().toISOString(),
        }).catch(() => { });
        res.status(201).json({ enrollment });
    }
    catch (error) {
        console.error('Enroll error:', error);
        res.status(500).json({ error: 'Failed to enroll' });
    }
});
// GET /courses/:id/enroll
router.get('/:id/enroll', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // For non-learners, behave as "not enrolled" (they can't self-enroll anyway).
        if (req.user?.role !== 'LEARNER') {
            return res.json({ enrolled: false, enrollment: null });
        }
        const enrollment = await (0, db_js_1.queryOne)('SELECT * FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        res.json({ enrolled: !!enrollment, enrollment: enrollment || null });
    }
    catch (error) {
        console.error('Check enrollment error:', error);
        res.status(500).json({ error: 'Failed to check enrollment' });
    }
});
// DELETE /courses/:id/enroll
router.delete('/:id/enroll', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role !== 'LEARNER') {
            return res.status(403).json({ error: 'Only learner accounts can unenroll from courses' });
        }
        const enrollment = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        if (!enrollment)
            return res.status(404).json({ error: 'Not enrolled in this course' });
        // Cascade: delete lesson_progress for this enrollment before deleting
        await (0, db_js_1.execute)('DELETE FROM lesson_progress WHERE enrollmentId = ?', [enrollment.id]);
        await (0, db_js_1.execute)('DELETE FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        res.json({ message: 'Unenrolled successfully' });
    }
    catch (error) {
        console.error('Unenroll error:', error);
        res.status(500).json({ error: 'Failed to unenroll' });
    }
});
// POST /courses/:id/invite
// Creator/Admin sends an invite email to join a published course.
router.post('/:id/invite', auth_js_1.authenticate, auth_js_1.requireCreatorOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email)
            return res.status(400).json({ error: 'email is required' });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ error: 'Invalid email format' });
        const course = await (0, db_js_1.queryOne)('SELECT id, title, status, creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        // Course must be published to allow enrollment by invite.
        if (course.status !== 'PUBLISHED') {
            return res.status(409).json({ error: 'Course must be published to send invites' });
        }
        // Creator can only invite to their own course.
        if (req.user.role === 'CREATOR' && course.creatorId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const inviteToken = jsonwebtoken_1.default.sign({
            type: 'course_invite',
            courseId: id,
            email,
            invitedById: req.user.id,
        }, JWT_SECRET, { expiresIn: (process.env.INVITE_EXPIRES_IN || '14d') });
        const inviter = await (0, db_js_1.queryOne)('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
        await (0, email_js_1.sendCourseInvite)(email, inviter?.name || inviter?.email || null, course.title, inviteToken);
        (0, activity_js_1.logActivity)({
            event: 'enrollment.created',
            userId: req.user.id,
            userName: inviter?.name || req.user.email,
            meta: { action: 'invite.sent', courseId: id, courseTitle: course.title, invitedEmail: email },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Invite error:', error);
        res.status(500).json({ error: 'Failed to send invite' });
    }
});
// GET /courses/:id/watch-activity - Daily watch activity for the last 7 days
router.get('/:id/watch-activity', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Use CST-based "today" so the 7-day window matches the user's local days
        const todayCST = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
        const rows = await (0, db_js_1.query)(`SELECT activityDate, watchedSeconds FROM watch_activity
       WHERE userId = ? AND courseId = ? AND activityDate >= DATE_SUB(?, INTERVAL 6 DAY)
       ORDER BY activityDate ASC`, [req.user.id, id, todayCST]);
        // Return activityDate as plain YYYY-MM-DD string
        // MySQL DATE columns come back as JS Date at midnight UTC — use toISOString to preserve the stored date
        const activity = rows.map((r) => ({
            activityDate: typeof r.activityDate === 'string' ? r.activityDate.slice(0, 10) : r.activityDate.toISOString().slice(0, 10),
            watchedSeconds: r.watchedSeconds,
        }));
        res.json({ activity });
    }
    catch (error) {
        console.error('Get watch activity error:', error);
        res.status(500).json({ error: 'Failed to get watch activity' });
    }
});
// GET /courses/:id/progress - Course player data with progress
router.get('/:id/progress', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const enrollment = await (0, db_js_1.queryOne)('SELECT * FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        if (!enrollment)
            return res.status(404).json({ error: 'Not enrolled in this course' });
        // ── Batch 1: All independent queries in parallel ──
        const [course, modulesRaw, allProgress, otherStudents, totalOtherRow] = await Promise.all([
            (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]),
            (0, db_js_1.query)('SELECT * FROM modules WHERE courseId = ? ORDER BY position ASC', [id]),
            (0, db_js_1.query)('SELECT * FROM lesson_progress WHERE enrollmentId = ?', [enrollment.id]),
            (0, db_js_1.query)(`SELECT u.id, u.name, u.image FROM enrollments e JOIN users u ON e.userId = u.id
         WHERE e.courseId = ? AND e.userId != ? LIMIT 5`, [id, req.user.id]),
            (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ? AND userId != ?', [id, req.user.id]),
        ]);
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [course?.creatorId]);
        const progressMap = new Map(allProgress.map(p => [p.lessonId, p]));
        // ── Batch 2: Lessons + resources (depend on moduleIds) ──
        const moduleIds = modulesRaw.map(m => m.id);
        let allLessons = [];
        let allResources = [];
        if (moduleIds.length > 0) {
            const ph = moduleIds.map(() => '?').join(', ');
            allLessons = await (0, db_js_1.query)(`SELECT * FROM lessons WHERE moduleId IN (${ph}) ORDER BY position ASC`, moduleIds);
            const lessonIds = allLessons.map(l => l.id);
            if (lessonIds.length > 0) {
                const ph2 = lessonIds.map(() => '?').join(', ');
                allResources = await (0, db_js_1.query)(`SELECT * FROM resources WHERE lessonId IN (${ph2}) ORDER BY createdAt ASC`, lessonIds);
            }
        }
        // Build lookup maps
        const lessonsByModule = new Map();
        for (const lesson of allLessons) {
            if (!lessonsByModule.has(lesson.moduleId))
                lessonsByModule.set(lesson.moduleId, []);
            lessonsByModule.get(lesson.moduleId).push(lesson);
        }
        const resourcesByLesson = new Map();
        for (const res of allResources) {
            if (!resourcesByLesson.has(res.lessonId))
                resourcesByLesson.set(res.lessonId, []);
            resourcesByLesson.get(res.lessonId).push(res);
        }
        const modules = modulesRaw.map(mod => {
            const lessons = (lessonsByModule.get(mod.id) || []).map(lesson => {
                const resources = resourcesByLesson.get(lesson.id) || [];
                const progress = progressMap.get(lesson.id);
                return {
                    id: lesson.id, title: lesson.title, description: lesson.description,
                    videoUrl: lesson.videoUrl, durationSeconds: lesson.durationSeconds,
                    position: lesson.position, isLocked: !!lesson.isLocked, isFreePreview: !!lesson.isFreePreview,
                    qaEnabled: lesson.qaEnabled === undefined ? true : !!lesson.qaEnabled,
                    notesEnabled: lesson.notesEnabled === undefined ? true : !!lesson.notesEnabled,
                    resources,
                    progress: progress ? {
                        id: progress.id, lessonId: progress.lessonId, enrollmentId: progress.enrollmentId,
                        progressPercent: progress.progressPercent,
                        lastWatchedTimestamp: progress.lastWatchedTimestamp || 0,
                        completedAt: progress.completedAt ? (progress.completedAt instanceof Date ? progress.completedAt.toISOString() : progress.completedAt) : null,
                        lastWatchedAt: progress.lastWatchedAt ? (progress.lastWatchedAt instanceof Date ? progress.lastWatchedAt.toISOString() : progress.lastWatchedAt) : null,
                    } : null,
                };
            });
            return { id: mod.id, title: mod.title, position: mod.position, lessons };
        });
        // Find current lesson (last watched or first available)
        const lastProgress = allProgress
            .filter(lp => lp.lastWatchedAt)
            .sort((a, b) => {
            const at = a.lastWatchedAt instanceof Date ? a.lastWatchedAt.getTime() : new Date(a.lastWatchedAt).getTime();
            const bt = b.lastWatchedAt instanceof Date ? b.lastWatchedAt.getTime() : new Date(b.lastWatchedAt).getTime();
            return bt - at;
        })[0];
        let currentLessonId;
        let initialTime = 0;
        if (lastProgress) {
            currentLessonId = lastProgress.lessonId;
            initialTime = lastProgress.lastWatchedTimestamp || 0;
        }
        else {
            for (const mod of modules) {
                if (mod.lessons.length > 0) {
                    currentLessonId = mod.lessons[0].id;
                    break;
                }
            }
        }
        // Other students (already fetched in batch 1 above)
        res.set('Cache-Control', 'private, max-age=30');
        res.json({
            id: course?.id, title: course?.title, description: course?.description,
            level: course?.level || 'ALL_LEVELS', language: course?.language || 'English',
            creator, modules, currentLessonId, initialTime,
            enrollmentId: enrollment.id,
            otherStudents,
            totalOtherStudents: Number(totalOtherRow?.cnt ?? 0),
        });
    }
    catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});
// GET /courses/:id/free-preview — Learner free preview (any authenticated user, only free preview lessons playable)
router.get('/:id/free-preview', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.status !== 'PUBLISHED')
            return res.status(404).json({ error: 'Course not found' });
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image, bio FROM users WHERE id = ?', [course.creatorId]);
        const modulesRaw = await (0, db_js_1.query)('SELECT * FROM modules WHERE courseId = ? ORDER BY position ASC', [id]);
        const moduleIds = modulesRaw.map(m => m.id);
        let allLessons = [];
        if (moduleIds.length > 0) {
            const ph = moduleIds.map(() => '?').join(', ');
            allLessons = await (0, db_js_1.query)(`SELECT * FROM lessons WHERE moduleId IN (${ph}) ORDER BY position ASC`, moduleIds);
        }
        // Build modules — only isFreePreview lessons are unlocked, rest are locked
        const lessonsByModule = new Map();
        for (const lesson of allLessons) {
            if (!lessonsByModule.has(lesson.moduleId))
                lessonsByModule.set(lesson.moduleId, []);
            lessonsByModule.get(lesson.moduleId).push(lesson);
        }
        const modules = modulesRaw.map(mod => {
            const lessons = (lessonsByModule.get(mod.id) || []).map(lesson => ({
                id: lesson.id, title: lesson.title, description: lesson.description,
                videoUrl: lesson.isFreePreview ? lesson.videoUrl : null,
                durationSeconds: lesson.durationSeconds,
                position: lesson.position,
                isLocked: !lesson.isFreePreview,
                isFreePreview: !!lesson.isFreePreview,
                qaEnabled: lesson.qaEnabled === undefined ? true : !!lesson.qaEnabled,
                notesEnabled: lesson.notesEnabled === undefined ? true : !!lesson.notesEnabled,
                resources: [],
                progress: null,
            }));
            return { id: mod.id, title: mod.title, position: mod.position, lessons };
        });
        const firstFreeLesson = modules.flatMap(m => m.lessons).find(l => l.isFreePreview);
        res.json({
            course: {
                ...course, creator, modules,
                level: course.level || 'ALL_LEVELS',
                language: course.language || 'English',
            },
            currentLessonId: firstFreeLesson?.id || null,
            isPreview: true,
            enrollmentId: '',
            otherStudents: [],
            totalOtherStudents: 0,
        });
    }
    catch (error) {
        console.error('Get free-preview error:', error);
        res.status(500).json({ error: 'Failed to get free preview' });
    }
});
// GET /courses/:id/preview — Admin/Creator preview (no enrollment required)
router.get('/:id/preview', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        // Only ADMIN or the course creator may preview
        if (req.user.role !== 'ADMIN' && course.creatorId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const creator = await (0, db_js_1.queryOne)('SELECT id, name, image, bio FROM users WHERE id = ?', [course.creatorId]);
        const modulesRaw = await (0, db_js_1.query)('SELECT * FROM modules WHERE courseId = ? ORDER BY position ASC', [id]);
        const moduleIds = modulesRaw.map(m => m.id);
        let allLessons = [];
        if (moduleIds.length > 0) {
            const ph = moduleIds.map(() => '?').join(', ');
            allLessons = await (0, db_js_1.query)(`SELECT * FROM lessons WHERE moduleId IN (${ph}) ORDER BY position ASC`, moduleIds);
        }
        const lessonIds = allLessons.map(l => l.id);
        let allResources = [];
        if (lessonIds.length > 0) {
            const ph2 = lessonIds.map(() => '?').join(', ');
            allResources = await (0, db_js_1.query)(`SELECT * FROM resources WHERE lessonId IN (${ph2}) ORDER BY createdAt ASC`, lessonIds);
        }
        const lessonsByModule = new Map();
        for (const lesson of allLessons) {
            if (!lessonsByModule.has(lesson.moduleId))
                lessonsByModule.set(lesson.moduleId, []);
            lessonsByModule.get(lesson.moduleId).push(lesson);
        }
        const resourcesByLesson = new Map();
        for (const r of allResources) {
            if (!resourcesByLesson.has(r.lessonId))
                resourcesByLesson.set(r.lessonId, []);
            resourcesByLesson.get(r.lessonId).push(r);
        }
        const modules = modulesRaw.map(mod => {
            const lessons = (lessonsByModule.get(mod.id) || []).map(lesson => ({
                id: lesson.id, title: lesson.title, description: lesson.description,
                videoUrl: lesson.videoUrl, durationSeconds: lesson.durationSeconds,
                position: lesson.position, isLocked: false, isFreePreview: !!lesson.isFreePreview,
                qaEnabled: lesson.qaEnabled === undefined ? true : !!lesson.qaEnabled,
                notesEnabled: lesson.notesEnabled === undefined ? true : !!lesson.notesEnabled,
                resources: resourcesByLesson.get(lesson.id) || [],
                progress: null,
            }));
            return { id: mod.id, title: mod.title, position: mod.position, lessons };
        });
        const firstLesson = modules.flatMap(m => m.lessons)[0];
        // Counts for overview display
        const enrollRow = await (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?', [id]);
        const reviewRows = await (0, db_js_1.query)('SELECT rating FROM reviews WHERE courseId = ?', [id]);
        const enrolledStudents = await (0, db_js_1.query)('SELECT u.id, u.name, u.image FROM enrollments e JOIN users u ON e.userId = u.id WHERE e.courseId = ? ORDER BY e.enrolledAt DESC LIMIT 5', [id]);
        const avgRating = reviewRows.length > 0
            ? Math.round((reviewRows.reduce((a, r) => a + r.rating, 0) / reviewRows.length) * 10) / 10
            : null;
        res.json({
            course: {
                ...course, creator, modules,
                level: course.level || 'ALL_LEVELS',
                language: course.language || 'English',
                _count: {
                    enrollments: Number(enrollRow?.cnt ?? 0),
                    reviews: reviewRows.length,
                    modules: modules.length,
                },
                avgRating,
                enrolledStudents,
            },
            currentLessonId: firstLesson?.id || null,
            isPreview: true,
        });
    }
    catch (error) {
        console.error('Get preview error:', error);
        res.status(500).json({ error: 'Failed to get preview' });
    }
});
// POST /courses/:id/modules
router.post('/:id/modules', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { title, position } = req.body;
        if (!title)
            return res.status(400).json({ error: 'title is required' });
        const maxPosRow = await (0, db_js_1.queryOne)('SELECT MAX(position) as maxPos FROM modules WHERE courseId = ?', [id]);
        const pos = position ?? ((maxPosRow?.maxPos ?? -1) + 1);
        const moduleId = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('INSERT INTO modules (id, title, position, courseId, updatedAt) VALUES (?, ?, ?, ?, ?)', [moduleId, title, pos, id, ts]);
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [moduleId]);
        res.status(201).json({ module: mod });
    }
    catch (error) {
        console.error('Create module error:', error);
        res.status(500).json({ error: 'Failed to create module' });
    }
});
// POST /courses/:id/lessons
router.post('/:id/lessons', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { title, description, videoUrl, durationSeconds, position, isLocked, isFreePreview, moduleId } = req.body;
        if (!title || !moduleId)
            return res.status(400).json({ error: 'title and moduleId are required' });
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [moduleId]);
        if (!mod || mod.courseId !== id)
            return res.status(400).json({ error: 'Invalid module' });
        const maxPosRow = await (0, db_js_1.queryOne)('SELECT MAX(position) as maxPos FROM lessons WHERE moduleId = ?', [moduleId]);
        const pos = position ?? ((maxPosRow?.maxPos ?? -1) + 1);
        const lessonId = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)(`INSERT INTO lessons (id, title, description, videoUrl, durationSeconds, position, isLocked, isFreePreview, moduleId, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [lessonId, title, description || null, videoUrl || null, durationSeconds ?? 0, pos,
            isLocked ?? false, isFreePreview ?? false, moduleId, ts]);
        const lesson = await (0, db_js_1.queryOne)('SELECT * FROM lessons WHERE id = ?', [lessonId]);
        if (lesson) {
            lesson.isLocked = !!lesson.isLocked;
            lesson.isFreePreview = !!lesson.isFreePreview;
        }
        res.status(201).json({ lesson });
    }
    catch (error) {
        console.error('Create lesson error:', error);
        res.status(500).json({ error: 'Failed to create lesson' });
    }
});
// PATCH /courses/:id/reorder - Reorder modules
router.patch('/:id/reorder', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { moduleOrder } = req.body;
        if (!Array.isArray(moduleOrder))
            return res.status(400).json({ error: 'moduleOrder must be an array' });
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const ts = (0, db_js_1.now)();
        await Promise.all(moduleOrder.map((moduleId, index) => (0, db_js_1.execute)('UPDATE modules SET position = ?, updatedAt = ? WHERE id = ?', [index, ts, moduleId])));
        res.json({ message: 'Modules reordered' });
    }
    catch (error) {
        console.error('Reorder modules error:', error);
        res.status(500).json({ error: 'Failed to reorder modules' });
    }
});
// POST /courses/:id/publish
router.post('/:id/publish', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('UPDATE courses SET status = ?, publishedAt = ?, updatedAt = ? WHERE id = ?', ['PUBLISHED', ts, ts, id]);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        // Generate OG page for social sharing
        if (updated)
            (0, og_js_1.upsertCourseOgPage)(updated).catch(() => { });
        res.json({ course: updated });
    }
    catch (error) {
        console.error('Publish course error:', error);
        res.status(500).json({ error: 'Failed to publish course' });
    }
});
// DELETE /courses/:id/publish
router.delete('/:id/publish', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('UPDATE courses SET status = ?, updatedAt = ? WHERE id = ?', ['DRAFT', (0, db_js_1.now)(), id]);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        // Remove OG page when unpublished
        (0, og_js_1.deleteCourseOgPage)(id).catch(() => { });
        res.json({ course: updated });
    }
    catch (error) {
        console.error('Unpublish course error:', error);
        res.status(500).json({ error: 'Failed to unpublish course' });
    }
});
// GET /courses/:id/reviews
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const totalRow = await (0, db_js_1.queryOne)('SELECT COUNT(*) as cnt FROM reviews WHERE courseId = ?', [id]);
        const total = Number(totalRow?.cnt ?? 0);
        const reviews = await (0, db_js_1.query)(`SELECT r.*, u.id as u_id, u.name as u_name, u.image as u_image
       FROM reviews r LEFT JOIN users u ON r.userId = u.id
       WHERE r.courseId = ?
       ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`, [id, limit, (page - 1) * limit]);
        const formatted = reviews.map(r => ({
            id: r.id, rating: r.rating, comment: r.comment, userId: r.userId, courseId: r.courseId,
            createdAt: r.createdAt, updatedAt: r.updatedAt,
            user: { id: r.u_id, name: r.u_name, image: r.u_image },
        }));
        // Rating distribution
        const allRatings = await (0, db_js_1.query)('SELECT rating FROM reviews WHERE courseId = ?', [id]);
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allRatings.forEach(r => { distribution[r.rating]++; });
        const avgRating = allRatings.length > 0
            ? allRatings.reduce((a, r) => a + r.rating, 0) / allRatings.length : 0;
        res.json({
            reviews: formatted,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            stats: {
                averageRating: Math.round(avgRating * 10) / 10,
                totalReviews: total,
                distribution,
            },
        });
    }
    catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});
// GET /courses/:id/my-review
router.get('/:id/my-review', auth_js_1.authenticate, async (req, res) => {
    try {
        const review = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE userId = ? AND courseId = ?', [req.user.id, req.params.id]);
        res.json({ review: review || null });
    }
    catch (error) {
        console.error('Get my review error:', error);
        res.status(500).json({ error: 'Failed to get review' });
    }
});
// POST /courses/:id/reviews
router.post('/:id/reviews', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        const enrollment = await (0, db_js_1.queryOne)('SELECT id FROM enrollments WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        if (!enrollment)
            return res.status(403).json({ error: 'Must be enrolled to review' });
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM reviews WHERE userId = ? AND courseId = ?', [req.user.id, id]);
        if (existing)
            return res.status(409).json({ error: 'Already reviewed this course' });
        const reviewId = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('INSERT INTO reviews (id, rating, comment, userId, courseId, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [reviewId, rating, comment || null, req.user.id, id, ts]);
        const review = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE id = ?', [reviewId]);
        const user = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [req.user.id]);
        // Notify the course creator about the new review
        const courseInfo = await (0, db_js_1.queryOne)('SELECT creatorId, title FROM courses WHERE id = ?', [id]);
        if (courseInfo && courseInfo.creatorId !== req.user.id) {
            (0, notifications_js_1.createNotification)({
                userId: courseInfo.creatorId,
                type: 'review',
                title: 'New Course Review',
                description: `${user?.name || 'A student'} left a ${rating}-star review on "${courseInfo.title}".`,
                link: `/manage-courses/${id}`,
            });
        }
        (0, activity_js_1.logActivity)({ event: 'review.created', userId: req.user.id, userName: user?.name || req.user.email, meta: { courseId: id, courseTitle: courseInfo?.title, rating } });
        res.status(201).json({ review: { ...review, user } });
    }
    catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});
// GET /courses/:id/analytics
router.get('/:id/analytics', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await (0, db_js_1.queryOne)('SELECT * FROM courses WHERE id = ?', [id]);
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Enrollments
        const enrollments = await (0, db_js_1.query)(`SELECT e.*, u.id as u_id, u.name as u_name, u.image as u_image
       FROM enrollments e JOIN users u ON e.userId = u.id
       WHERE e.courseId = ?`, [id]);
        // All lessons in course
        const lessonRows = await (0, db_js_1.query)('SELECT l.* FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId = ? ORDER BY m.position, l.position', [id]);
        const totalLessons = lessonRows.length;
        // Reviews
        const reviewRows = await (0, db_js_1.query)('SELECT rating FROM reviews WHERE courseId = ?', [id]);
        const avgRating = reviewRows.length > 0
            ? reviewRows.reduce((a, r) => a + r.rating, 0) / reviewRows.length : 0;
        // Progress per enrollment
        const enrollmentIds = enrollments.map(e => e.id);
        let progressByEnrollment = new Map();
        if (enrollmentIds.length > 0) {
            const ep = (0, db_js_1.inPlaceholders)(enrollmentIds);
            const allProgress = await (0, db_js_1.query)(`SELECT * FROM lesson_progress WHERE enrollmentId IN (${ep})`, enrollmentIds);
            for (const p of allProgress) {
                if (!progressByEnrollment.has(p.enrollmentId))
                    progressByEnrollment.set(p.enrollmentId, []);
                progressByEnrollment.get(p.enrollmentId).push(p);
            }
        }
        const studentProgress = enrollments.map(e => {
            const progress = progressByEnrollment.get(e.id) ?? [];
            const completed = progress.filter(p => p.completedAt).length;
            const pct = totalLessons > 0 ? (completed / totalLessons) * 100 : 0;
            return {
                userId: e.u_id, name: e.u_name,
                progress: Math.round(pct * 10) / 10,
                completedAt: completed === totalLessons && totalLessons > 0
                    ? progress.filter(p => p.completedAt).sort((a, b) => {
                        const at2 = a.completedAt instanceof Date ? a.completedAt.getTime() : new Date(a.completedAt).getTime();
                        const bt2 = b.completedAt instanceof Date ? b.completedAt.getTime() : new Date(b.completedAt).getTime();
                        return bt2 - at2;
                    })[0]?.completedAt : null,
            };
        });
        const completedStudents = studentProgress.filter(s => s.progress === 100).length;
        const completionRate = enrollments.length > 0 ? (completedStudents / enrollments.length) * 100 : 0;
        const averageProgress = studentProgress.length > 0
            ? studentProgress.reduce((a, s) => a + s.progress, 0) / studentProgress.length : 0;
        // Enrollment trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const enrollmentTrend = enrollments
            .filter(e => new Date(e.enrolledAt) >= thirtyDaysAgo)
            .reduce((acc, e) => {
            const d = (e.enrolledAt instanceof Date ? e.enrolledAt.toISOString() : String(e.enrolledAt)).split('T')[0];
            acc[d] = (acc[d] || 0) + 1;
            return acc;
        }, {});
        const enrollmentTrendArray = Object.entries(enrollmentTrend)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Lesson stats
        const lessonStats = lessonRows.map(lesson => {
            let completedCnt = 0;
            let totalWatchTime = 0;
            let watchCount = 0;
            for (const [, progressArr] of progressByEnrollment) {
                for (const p of progressArr) {
                    if (p.lessonId === lesson.id) {
                        if (p.completedAt)
                            completedCnt++;
                        totalWatchTime += p.lastWatchedTimestamp ?? 0;
                        watchCount++;
                    }
                }
            }
            return {
                lessonId: lesson.id, title: lesson.title,
                completionRate: enrollments.length > 0 ? Math.round((completedCnt / enrollments.length) * 100) : 0,
                averageWatchTime: watchCount > 0 ? Math.round(totalWatchTime / watchCount) : 0,
                dropOffRate: 0,
            };
        });
        const topStudents = studentProgress.sort((a, b) => b.progress - a.progress).slice(0, 10);
        res.json({
            analytics: {
                courseId: id,
                overview: {
                    totalEnrollments: enrollments.length,
                    activeStudents: studentProgress.filter(s => s.progress > 0 && s.progress < 100).length,
                    completionRate: Math.round(completionRate * 10) / 10,
                    averageProgress: Math.round(averageProgress * 10) / 10,
                    averageRating: Math.round(avgRating * 10) / 10,
                    totalRevenue: enrollments.length * course.price,
                },
                enrollmentTrend: enrollmentTrendArray,
                lessonStats, topStudents,
            },
        });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=courses.js.map