"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /analytics - Dashboard analytics (Admin only)
router.get('/', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Get overview stats
        const [totalUsers, totalCourses, totalEnrollments, allCourses, recentUsers, recentEnrollments, usersByRole, coursesByCategory,] = await Promise.all([
            app_js_1.prisma.user.count(),
            app_js_1.prisma.course.count(),
            app_js_1.prisma.enrollment.count(),
            app_js_1.prisma.course.findMany({
                select: { price: true, enrollments: { select: { id: true } } },
            }),
            app_js_1.prisma.user.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true },
            }),
            app_js_1.prisma.enrollment.findMany({
                where: { enrolledAt: { gte: thirtyDaysAgo } },
                select: { enrolledAt: true, course: { select: { price: true } } },
            }),
            app_js_1.prisma.user.groupBy({
                by: ['role'],
                _count: { id: true },
            }),
            app_js_1.prisma.course.groupBy({
                by: ['category'],
                _count: { id: true },
                where: { category: { not: null } },
            }),
        ]);
        // Calculate total revenue
        const totalRevenue = allCourses.reduce((acc, course) => acc + course.price * course.enrollments.length, 0);
        // Active users (users with progress in last 30 days)
        const activeUsers = await app_js_1.prisma.lessonProgress.findMany({
            where: { lastWatchedAt: { gte: thirtyDaysAgo } },
            select: { enrollment: { select: { userId: true } } },
            distinct: ['enrollmentId'],
        });
        // Calculate completion rates
        const enrollmentsWithProgress = await app_js_1.prisma.enrollment.findMany({
            include: {
                lessonProgress: true,
                course: {
                    include: {
                        modules: {
                            include: {
                                lessons: { select: { id: true } },
                            },
                        },
                    },
                },
            },
        });
        let completedCount = 0;
        enrollmentsWithProgress.forEach((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce((a, m) => a + m.lessons.length, 0);
            const completedLessons = enrollment.lessonProgress.filter((lp) => lp.completedAt).length;
            if (totalLessons > 0 && completedLessons === totalLessons) {
                completedCount++;
            }
        });
        const completionRate = totalEnrollments > 0
            ? (completedCount / totalEnrollments) * 100
            : 0;
        // User trends (by month)
        const userTrends = recentUsers.reduce((acc, user) => {
            const date = user.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        const userTrendsArray = Object.entries(userTrends)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Enrollment trends
        const enrollmentTrends = recentEnrollments.reduce((acc, enrollment) => {
            const date = enrollment.enrolledAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        const enrollmentTrendsArray = Object.entries(enrollmentTrends)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Revenue trends
        const revenueTrends = recentEnrollments.reduce((acc, enrollment) => {
            const date = enrollment.enrolledAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + enrollment.course.price;
            return acc;
        }, {});
        const revenueTrendsArray = Object.entries(revenueTrends)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Top courses
        const topCourses = await app_js_1.prisma.course.findMany({
            include: {
                _count: { select: { enrollments: true } },
                reviews: { select: { rating: true } },
                enrollments: { select: { id: true } },
            },
            orderBy: { enrollments: { _count: 'desc' } },
            take: 10,
        });
        const topCoursesWithStats = topCourses.map((course) => ({
            id: course.id,
            title: course.title,
            enrollments: course._count.enrollments,
            revenue: course.price * course.enrollments.length,
            rating: course.reviews.length > 0
                ? Math.round((course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length) * 10) / 10
                : null,
        }));
        // User distribution
        const userDistribution = usersByRole.reduce((acc, item) => {
            acc[item.role] = item._count.id;
            return acc;
        }, {});
        // Category distribution
        const categoryDistribution = coursesByCategory
            .filter((item) => item.category)
            .map((item) => ({
            category: item.category,
            count: item._count.id,
        }));
        // Progress distribution buckets
        const progressBuckets = {
            '0-25': 0,
            '25-50': 0,
            '50-75': 0,
            '75-100': 0,
            'completed': 0,
        };
        enrollmentsWithProgress.forEach((enrollment) => {
            const totalLessonsInCourse = enrollment.course.modules.reduce((a, m) => a + m.lessons.length, 0);
            if (totalLessonsInCourse === 0)
                return;
            const completedLessonsCount = enrollment.lessonProgress.filter((lp) => lp.completedAt).length;
            const progressPct = (completedLessonsCount / totalLessonsInCourse) * 100;
            if (progressPct >= 100) {
                progressBuckets['completed']++;
            }
            else if (progressPct >= 75) {
                progressBuckets['75-100']++;
            }
            else if (progressPct >= 50) {
                progressBuckets['50-75']++;
            }
            else if (progressPct >= 25) {
                progressBuckets['25-50']++;
            }
            else {
                progressBuckets['0-25']++;
            }
        });
        // Top learners by progress
        const topLearners = await app_js_1.prisma.enrollment.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                course: { select: { title: true } },
                lessonProgress: {
                    orderBy: { lastWatchedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { enrolledAt: 'desc' },
            take: 10,
        });
        const topLearnersData = topLearners.map((enrollment) => ({
            email: enrollment.user.email,
            name: enrollment.user.name,
            lastActive: enrollment.lessonProgress[0]?.lastWatchedAt?.toISOString() || null,
            course: enrollment.course.title,
            progress: 0, // Would need full progress calculation
        }));
        res.json({
            analytics: {
                overview: {
                    totalUsers,
                    totalCourses,
                    totalEnrollments,
                    totalRevenue: Math.round(totalRevenue * 100) / 100,
                    activeUsers: activeUsers.length,
                    completionRate: Math.round(completionRate * 10) / 10,
                },
                trends: {
                    users: userTrendsArray,
                    enrollments: enrollmentTrendsArray,
                    revenue: revenueTrendsArray,
                },
                topCourses: topCoursesWithStats,
                userDistribution,
                categoryDistribution,
                progressBuckets,
                topLearners: topLearnersData,
            },
        });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});
// GET /analytics/creator-stats - Get current creator's stats
router.get('/creator-stats', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [totalCourses, publishedCourses, coursesWithEnrollments, reviewsData] = await Promise.all([
            app_js_1.prisma.course.count({ where: { creatorId: userId } }),
            app_js_1.prisma.course.count({ where: { creatorId: userId, status: 'PUBLISHED' } }),
            app_js_1.prisma.course.findMany({
                where: { creatorId: userId },
                select: { price: true, _count: { select: { enrollments: true } } },
            }),
            app_js_1.prisma.review.findMany({
                where: { course: { creatorId: userId } },
                select: { rating: true },
            }),
        ]);
        const totalEnrollments = coursesWithEnrollments.reduce((sum, c) => sum + c._count.enrollments, 0);
        const totalRevenue = coursesWithEnrollments.reduce((sum, c) => sum + c.price * c._count.enrollments, 0);
        const totalReviews = reviewsData.length;
        const avgRating = totalReviews > 0
            ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : '0.0';
        res.json({
            totalCourses,
            publishedCourses,
            totalEnrollments,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalReviews,
            avgRating,
        });
    }
    catch (error) {
        console.error('Get creator stats error:', error);
        res.status(500).json({ error: 'Failed to get creator stats' });
    }
});
// GET /analytics/learner-stats - Get current user's learning stats
router.get('/learner-stats', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get user's enrollments with progress
        const enrollments = await app_js_1.prisma.enrollment.findMany({
            where: { userId },
            include: {
                course: {
                    include: {
                        modules: {
                            include: {
                                lessons: { select: { id: true } },
                            },
                        },
                    },
                },
                lessonProgress: true,
            },
        });
        let totalCourses = enrollments.length;
        let completedCourses = 0;
        let inProgressCourses = 0;
        let totalLessonsCompleted = 0;
        let totalWatchTime = 0;
        enrollments.forEach((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce((a, m) => a + m.lessons.length, 0);
            const completedLessons = enrollment.lessonProgress.filter((lp) => lp.completedAt).length;
            totalLessonsCompleted += completedLessons;
            // Calculate watch time (sum of progressPercent as approximate hours)
            enrollment.lessonProgress.forEach((lp) => {
                totalWatchTime += lp.progressPercent / 100;
            });
            if (totalLessons > 0 && completedLessons === totalLessons) {
                completedCourses++;
            }
            else if (completedLessons > 0) {
                inProgressCourses++;
            }
        });
        // Format enrollments for response
        const formattedEnrollments = enrollments.map((enrollment) => ({
            id: enrollment.id,
            userId: enrollment.userId,
            courseId: enrollment.courseId,
            enrolledAt: enrollment.enrolledAt.toISOString(),
            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                thumbnail: enrollment.course.coverImage,
            },
            lessonProgress: enrollment.lessonProgress.map((lp) => ({
                progressPercent: lp.progressPercent,
                completedAt: lp.completedAt?.toISOString() || null,
            })),
        }));
        res.json({
            totalCourses,
            completedCourses,
            inProgressCourses,
            totalLessonsCompleted,
            totalWatchHours: Math.round(totalWatchTime),
            enrollments: formattedEnrollments,
        });
    }
    catch (error) {
        console.error('Get learner stats error:', error);
        res.status(500).json({ error: 'Failed to get learner stats' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map