"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Validation schemas
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    bio: zod_1.z.string().optional(),
    image: zod_1.z.string().url().optional(),
    role: zod_1.z.enum(['LEARNER', 'CREATOR', 'ADMIN']).optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string(),
    newPassword: zod_1.z.string().min(6),
});
// GET /users - List all users (Admin only)
router.get('/', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const role = req.query.role;
        const where = {};
        // Note: SQLite doesn't support mode: 'insensitive', so we filter in-memory
        const searchQuery = search?.toLowerCase();
        if (role) {
            where.role = role;
        }
        let allUsers = await app_js_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        enrollments: true,
                        courses: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // In-memory search filtering (SQLite-safe)
        if (searchQuery) {
            allUsers = allUsers.filter((u) => (u.name && u.name.toLowerCase().includes(searchQuery)) ||
                u.email.toLowerCase().includes(searchQuery));
        }
        const total = allUsers.length;
        const users = allUsers.slice((page - 1) * limit, page * limit);
        const userIds = users.map((u) => u.id);
        // Last activity: max of lastWatchedAt from lesson progress, fallback to user updatedAt
        const enrollmentsForUsers = await app_js_1.prisma.enrollment.findMany({
            where: { userId: { in: userIds } },
            select: { id: true, userId: true },
        });
        const enrollmentIds = enrollmentsForUsers.map((e) => e.id);
        const lastWatched = enrollmentIds.length
            ? await app_js_1.prisma.lessonProgress.findMany({
                where: { enrollmentId: { in: enrollmentIds } },
                select: { lastWatchedAt: true, enrollmentId: true },
            })
            : [];
        const lastByEnrollment = new Map();
        for (const lp of lastWatched) {
            if (lp.lastWatchedAt) {
                const existing = lastByEnrollment.get(lp.enrollmentId);
                if (!existing || lp.lastWatchedAt > existing) {
                    lastByEnrollment.set(lp.enrollmentId, lp.lastWatchedAt);
                }
            }
        }
        const enrollmentToUser = new Map(enrollmentsForUsers.map((e) => [e.id, e.userId]));
        const lastActiveByUser = new Map();
        for (const [eid, date] of lastByEnrollment) {
            if (!date)
                continue;
            const uid = enrollmentToUser.get(eid);
            if (uid) {
                const existing = lastActiveByUser.get(uid);
                if (!existing || date > existing)
                    lastActiveByUser.set(uid, date);
            }
        }
        // Completed courses count per user (enrollment where all lessons completed)
        const enrollmentsWithProgress = await app_js_1.prisma.enrollment.findMany({
            where: { userId: { in: userIds } },
            include: {
                course: {
                    select: {
                        modules: {
                            select: {
                                lessons: { select: { id: true } },
                            },
                        },
                    },
                },
                lessonProgress: {
                    select: { completedAt: true, lessonId: true },
                },
            },
        });
        const completedCountByUser = new Map();
        for (const uid of userIds)
            completedCountByUser.set(uid, 0);
        for (const enr of enrollmentsWithProgress) {
            const totalLessons = enr.course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
            const completedLessons = enr.lessonProgress.filter((lp) => lp.completedAt != null).length;
            if (totalLessons > 0 && completedLessons === totalLessons) {
                completedCountByUser.set(enr.userId, (completedCountByUser.get(enr.userId) ?? 0) + 1);
            }
        }
        const usersWithStats = users.map((u) => {
            const lastActiveAt = lastActiveByUser.get(u.id) ?? u.updatedAt ?? u.createdAt;
            return {
                ...u,
                lastActiveAt: lastActiveAt instanceof Date ? lastActiveAt.toISOString() : lastActiveAt,
                completedCoursesCount: completedCountByUser.get(u.id) ?? 0,
            };
        });
        res.json({
            users: usersWithStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});
// GET /users/profile - Get current user profile
router.get('/profile', auth_js_1.authenticate, async (req, res) => {
    try {
        const user = await app_js_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                bio: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        enrollments: true,
                        courses: true,
                        reviews: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
// GET /users/profile/enrollments - Get current user's enrollments
router.get('/profile/enrollments', auth_js_1.authenticate, async (req, res) => {
    try {
        const enrollments = await app_js_1.prisma.enrollment.findMany({
            where: { userId: req.user.id },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        subtitle: true,
                        coverImage: true,
                        price: true,
                        level: true,
                        category: true,
                        creator: {
                            select: { id: true, name: true, image: true },
                        },
                        modules: {
                            include: {
                                lessons: {
                                    select: { id: true, durationSeconds: true },
                                },
                            },
                        },
                    },
                },
                lessonProgress: true,
            },
            orderBy: { enrolledAt: 'desc' },
        });
        res.json({ enrollments });
    }
    catch (error) {
        console.error('Get profile enrollments error:', error);
        res.status(500).json({ error: 'Failed to get enrollments' });
    }
});
// PATCH /users/profile - Update current user profile
router.patch('/profile', auth_js_1.authenticate, async (req, res) => {
    try {
        const data = updateUserSchema.parse(req.body);
        // Remove role if not admin
        if (req.user.role !== 'ADMIN') {
            delete data.role;
        }
        const user = await app_js_1.prisma.user.update({
            where: { id: req.user.id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                bio: true,
                role: true,
                updatedAt: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// PATCH /users/password - Change password
router.patch('/password', auth_js_1.authenticate, async (req, res) => {
    try {
        const data = changePasswordSchema.parse(req.body);
        const user = await app_js_1.prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user || !user.password) {
            return res.status(400).json({ error: 'Cannot change password' });
        }
        const valid = await bcryptjs_1.default.compare(data.currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, 10);
        await app_js_1.prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// GET /users/:id - Get user by ID
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin or self can view
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await app_js_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                bio: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        enrollments: true,
                        courses: true,
                        reviews: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Last activity: max lastWatchedAt from lesson progress, fallback to updatedAt
        const enrollments = await app_js_1.prisma.enrollment.findMany({
            where: { userId: id },
            select: { id: true },
        });
        const enrollmentIds = enrollments.map((e) => e.id);
        let lastActiveAt = null;
        if (enrollmentIds.length > 0) {
            const latest = await app_js_1.prisma.lessonProgress.findFirst({
                where: { enrollmentId: { in: enrollmentIds } },
                orderBy: { lastWatchedAt: 'desc' },
                select: { lastWatchedAt: true },
            });
            lastActiveAt = latest?.lastWatchedAt ?? null;
        }
        const lastActive = lastActiveAt ?? user.updatedAt;
        res.json({
            user: {
                ...user,
                lastActiveAt: lastActive ? (lastActive instanceof Date ? lastActive.toISOString() : lastActive) : null,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
// PATCH /users/:id - Update user (Admin or self)
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin or self can update
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateUserSchema.parse(req.body);
        // Only admin can change role
        if (req.user.role !== 'ADMIN') {
            delete data.role;
        }
        const user = await app_js_1.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                bio: true,
                role: true,
                updatedAt: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// DELETE /users/:id - Delete user (Admin or self)
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin or self can delete
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// GET /users/:id/enrollments - Get user's enrollments
router.get('/:id/enrollments', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Only admin or self can view
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const enrollments = await app_js_1.prisma.enrollment.findMany({
            where: { userId: id },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        coverImage: true,
                        price: true,
                        creator: {
                            select: { name: true },
                        },
                        modules: {
                            include: {
                                lessons: {
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                lessonProgress: true,
            },
            orderBy: { enrolledAt: 'desc' },
        });
        // Calculate progress and last activity for each enrollment
        const enrollmentsWithProgress = enrollments.map((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
            const completedLessons = enrollment.lessonProgress.filter((lp) => lp.completedAt != null).length;
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            const lastActivityAt = enrollment.lessonProgress.reduce((max, lp) => {
                const d = lp.lastWatchedAt ?? lp.completedAt ?? lp.updatedAt;
                if (!d)
                    return max;
                return !max || d > max ? d : max;
            }, null);
            return {
                id: enrollment.id,
                courseId: enrollment.course.id,
                courseTitle: enrollment.course.title,
                coursePrice: enrollment.course.price ?? 0,
                enrolledAt: enrollment.enrolledAt,
                totalLessons,
                completedLessons,
                progressPercent: Math.round(progress * 10) / 10,
                lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
                isCompleted: totalLessons > 0 && completedLessons === totalLessons,
                course: {
                    id: enrollment.course.id,
                    title: enrollment.course.title,
                    coverImage: enrollment.course.coverImage,
                    creator: enrollment.course.creator,
                },
                progress: Math.round(progress * 10) / 10,
            };
        });
        res.json({ enrollments: enrollmentsWithProgress });
    }
    catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({ error: 'Failed to get enrollments' });
    }
});
// POST /users - Create user (Admin only)
router.post('/', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const createUserSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6),
            name: zod_1.z.string().min(2).optional(),
            role: zod_1.z.enum(['LEARNER', 'CREATOR', 'ADMIN']).optional(),
        });
        const data = createUserSchema.parse(req.body);
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        const user = await app_js_1.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name || null,
                role: data.role || 'LEARNER',
            },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
                createdAt: true,
            },
        });
        res.status(201).json({ user });
    }
    catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
// POST /users/:id/block - Block a user (Admin only)
router.post('/:id/block', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        // Don't allow blocking yourself
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }
        const user = await app_js_1.prisma.user.update({
            where: { id: userId },
            data: { blockedAt: new Date() },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                blockedAt: true,
            },
        });
        res.json({ user, message: 'User blocked successfully' });
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
});
// POST /users/:id/unblock - Unblock a user (Admin only)
router.post('/:id/unblock', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await app_js_1.prisma.user.update({
            where: { id: userId },
            data: { blockedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                blockedAt: true,
            },
        });
        res.json({ user, message: 'User unblocked successfully' });
    }
    catch (error) {
        if (error?.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Unblock user error:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map