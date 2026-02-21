import { Router, Response } from 'express';
import { query, queryOne, execute, inPlaceholders } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /analytics - Dashboard analytics (Admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');

    // Overview counts
    const [usersRow, coursesRow, enrollmentsRow] = await Promise.all([
      queryOne<any>('SELECT COUNT(*) as cnt FROM users'),
      queryOne<any>('SELECT COUNT(*) as cnt FROM courses'),
      queryOne<any>('SELECT COUNT(*) as cnt FROM enrollments'),
    ]);
    const totalUsers = Number(usersRow?.cnt ?? 0);
    const totalCourses = Number(coursesRow?.cnt ?? 0);
    const totalEnrollments = Number(enrollmentsRow?.cnt ?? 0);

    // Total revenue
    const revenueRow = await queryOne<any>(
      `SELECT SUM(c.price * sub.cnt) as revenue
       FROM courses c JOIN (SELECT courseId, COUNT(*) as cnt FROM enrollments GROUP BY courseId) sub ON c.id = sub.courseId`
    );
    const totalRevenue = Number(revenueRow?.revenue ?? 0);

    // Active users (with progress in last 30 days)
    const activeRow = await queryOne<any>(
      `SELECT COUNT(DISTINCT en.userId) as cnt
       FROM lesson_progress lp JOIN enrollments en ON lp.enrollmentId = en.id
       WHERE lp.lastWatchedAt >= ?`,
      [thirtyDaysStr]
    );
    const activeUsers = Number(activeRow?.cnt ?? 0);

    // Completion rate
    const enrollmentsForCompletion = await query<any[]>(
      `SELECT en.id as enrollmentId, en.courseId FROM enrollments en`
    );
    let completedCount = 0;
    if (enrollmentsForCompletion.length > 0) {
      const courseIds = [...new Set(enrollmentsForCompletion.map(e => e.courseId))];
      const cp = inPlaceholders(courseIds);
      const lessonCounts = await query<any[]>(
        `SELECT m.courseId, COUNT(l.id) as cnt FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId IN (${cp}) GROUP BY m.courseId`,
        courseIds
      );
      const totalLessonsMap = new Map(lessonCounts.map(r => [r.courseId, Number(r.cnt)]));

      const eIds = enrollmentsForCompletion.map(e => e.enrollmentId);
      const ep = inPlaceholders(eIds);
      const completedLessonCounts = await query<any[]>(
        `SELECT enrollmentId, COUNT(*) as cnt FROM lesson_progress WHERE enrollmentId IN (${ep}) AND completedAt IS NOT NULL GROUP BY enrollmentId`,
        eIds
      );
      const completedMap = new Map(completedLessonCounts.map(r => [r.enrollmentId, Number(r.cnt)]));

      for (const enr of enrollmentsForCompletion) {
        const tl = totalLessonsMap.get(enr.courseId) ?? 0;
        const cl = completedMap.get(enr.enrollmentId) ?? 0;
        if (tl > 0 && cl >= tl) completedCount++;
      }
    }
    const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;

    // User trends (last 30 days)
    const recentUsers = await query<any[]>(
      'SELECT createdAt FROM users WHERE createdAt >= ?',
      [thirtyDaysStr]
    );
    const userTrends: Record<string, number> = {};
    for (const u of recentUsers) {
      const d = (u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt)).split('T')[0];
      userTrends[d] = (userTrends[d] || 0) + 1;
    }
    const userTrendsArray = Object.entries(userTrends).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    // Enrollment trends (last 30 days)
    const recentEnrollments = await query<any[]>(
      `SELECT e.enrolledAt, c.price FROM enrollments e JOIN courses c ON e.courseId = c.id WHERE e.enrolledAt >= ?`,
      [thirtyDaysStr]
    );
    const enrollmentTrends: Record<string, number> = {};
    const revenueTrends: Record<string, number> = {};
    for (const e of recentEnrollments) {
      const d = (e.enrolledAt instanceof Date ? e.enrolledAt.toISOString() : String(e.enrolledAt)).split('T')[0];
      enrollmentTrends[d] = (enrollmentTrends[d] || 0) + 1;
      revenueTrends[d] = (revenueTrends[d] || 0) + (e.price || 0);
    }
    const enrollmentTrendsArray = Object.entries(enrollmentTrends).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const revenueTrendsArray = Object.entries(revenueTrends).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

    // Top courses
    const topCourses = await query<any[]>(
      `SELECT c.id, c.title, c.price, COUNT(e.id) as enrollCount
       FROM courses c LEFT JOIN enrollments e ON e.courseId = c.id
       GROUP BY c.id ORDER BY enrollCount DESC LIMIT 10`
    );
    const topCoursesIds = topCourses.map(c => c.id);
    let ratingsByCourse = new Map<string, { sum: number; cnt: number }>();
    if (topCoursesIds.length > 0) {
      const rp = inPlaceholders(topCoursesIds);
      const ratings = await query<any[]>(
        `SELECT courseId, AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE courseId IN (${rp}) GROUP BY courseId`,
        topCoursesIds
      );
      for (const r of ratings) ratingsByCourse.set(r.courseId, { sum: Number(r.avg), cnt: Number(r.cnt) });
    }
    const topCoursesWithStats = topCourses.map(c => ({
      id: c.id, title: c.title,
      enrollments: Number(c.enrollCount),
      revenue: c.price * Number(c.enrollCount),
      rating: ratingsByCourse.has(c.id) ? Math.round(ratingsByCourse.get(c.id)!.sum * 10) / 10 : null,
    }));

    // User distribution by role
    const roleRows = await query<any[]>('SELECT role, COUNT(*) as cnt FROM users GROUP BY role');
    const userDistribution: Record<string, number> = {};
    for (const r of roleRows) userDistribution[r.role] = Number(r.cnt);

    // Category distribution
    const catRows = await query<any[]>(
      'SELECT category, COUNT(*) as cnt FROM courses WHERE category IS NOT NULL GROUP BY category'
    );
    const categoryDistribution = catRows.map(r => ({ category: r.category, count: Number(r.cnt) }));

    // Progress distribution buckets
    const progressBuckets: Record<string, number> = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0, 'completed': 0 };
    let totalLessonsMap2 = new Map<string, number>();
    // Use the already-computed enrollment data
    if (enrollmentsForCompletion.length > 0) {
      const courseIds = [...new Set(enrollmentsForCompletion.map(e => e.courseId))];
      const cp2 = inPlaceholders(courseIds);
      const lessonCounts2 = await query<any[]>(
        `SELECT m.courseId, COUNT(l.id) as cnt FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId IN (${cp2}) GROUP BY m.courseId`,
        courseIds
      );
      totalLessonsMap2 = new Map(lessonCounts2.map(r => [r.courseId, Number(r.cnt)]));

      const eIds2 = enrollmentsForCompletion.map(e => e.enrollmentId);
      const ep2 = inPlaceholders(eIds2);
      // Use SUM of individual progressPercent for accurate partial-progress tracking
      const progressSums2 = await query<any[]>(
        `SELECT enrollmentId, SUM(progressPercent) as totalProgress FROM lesson_progress WHERE enrollmentId IN (${ep2}) GROUP BY enrollmentId`,
        eIds2
      );
      const progressMap2 = new Map(progressSums2.map(r => [r.enrollmentId, Number(r.totalProgress)]));

      for (const enr of enrollmentsForCompletion) {
        const tl = totalLessonsMap2.get(enr.courseId) ?? 0;
        if (tl === 0) continue;
        // Average progressPercent across all lessons (untracked lessons count as 0%)
        const pct = (progressMap2.get(enr.enrollmentId) ?? 0) / tl;
        if (pct >= 100) progressBuckets['completed']++;
        else if (pct >= 75) progressBuckets['75-100']++;
        else if (pct >= 50) progressBuckets['50-75']++;
        else if (pct >= 25) progressBuckets['25-50']++;
        else progressBuckets['0-25']++;
      }
    }

    // Top learners
    const topLearners = await query<any[]>(
      `SELECT e.id as enrollmentId, e.courseId, u.email, u.name, c.title as course,
              (SELECT MAX(lp2.lastWatchedAt) FROM lesson_progress lp2 WHERE lp2.enrollmentId = e.id) as lastActive
       FROM enrollments e
       JOIN users u ON e.userId = u.id
       JOIN courses c ON e.courseId = c.id
       ORDER BY e.enrolledAt DESC LIMIT 10`
    );

    // Calculate actual progress for top learners
    let topLearnerProgressMap = new Map<string, number>();
    if (topLearners.length > 0) {
      const tlIds = topLearners.map(e => e.enrollmentId);
      const tlp = inPlaceholders(tlIds);
      const tlProgressRows = await query<any[]>(
        `SELECT enrollmentId, SUM(progressPercent) as totalProgress FROM lesson_progress WHERE enrollmentId IN (${tlp}) GROUP BY enrollmentId`,
        tlIds
      );
      for (const r of tlProgressRows) topLearnerProgressMap.set(r.enrollmentId, Number(r.totalProgress));

      // Get lesson counts for courses not yet in totalLessonsMap2
      const missingCourseIds = topLearners.map(e => e.courseId).filter(cid => !totalLessonsMap2.has(cid));
      if (missingCourseIds.length > 0) {
        const mc = inPlaceholders(missingCourseIds);
        const missingCounts = await query<any[]>(
          `SELECT m.courseId, COUNT(l.id) as cnt FROM modules m JOIN lessons l ON l.moduleId = m.id WHERE m.courseId IN (${mc}) GROUP BY m.courseId`,
          missingCourseIds
        );
        for (const r of missingCounts) totalLessonsMap2.set(r.courseId, Number(r.cnt));
      }
    }

    const topLearnersData = topLearners.map(e => {
      const tl = totalLessonsMap2.get(e.courseId) ?? 0;
      const tp = topLearnerProgressMap.get(e.enrollmentId) ?? 0;
      const progress = tl > 0 ? Math.round(tp / tl) : 0;
      return {
        email: e.email, name: e.name,
        lastActive: e.lastActive ? (e.lastActive instanceof Date ? e.lastActive.toISOString() : e.lastActive) : null,
        course: e.course, progress: Math.min(progress, 100),
      };
    });

    res.json({
      analytics: {
        overview: {
          totalUsers, totalCourses, totalEnrollments,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          activeUsers, completionRate: Math.round(completionRate * 10) / 10,
        },
        trends: { users: userTrendsArray, enrollments: enrollmentTrendsArray, revenue: revenueTrendsArray },
        topCourses: topCoursesWithStats,
        userDistribution, categoryDistribution, progressBuckets,
        topLearners: topLearnersData,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// GET /analytics/creator-stats
router.get('/creator-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [totalRow, publishedRow, enrollData, reviewsData] = await Promise.all([
      queryOne<any>('SELECT COUNT(*) as cnt FROM courses WHERE creatorId = ?', [userId]),
      queryOne<any>('SELECT COUNT(*) as cnt FROM courses WHERE creatorId = ? AND status = ?', [userId, 'PUBLISHED']),
      query<any[]>(
        `SELECT c.price, COUNT(e.id) as enrollCount
         FROM courses c LEFT JOIN enrollments e ON e.courseId = c.id
         WHERE c.creatorId = ? GROUP BY c.id`,
        [userId]
      ),
      query<any[]>(
        'SELECT r.rating FROM reviews r JOIN courses c ON r.courseId = c.id WHERE c.creatorId = ?',
        [userId]
      ),
    ]);

    const totalEnrollments = enrollData.reduce((s, c) => s + Number(c.enrollCount), 0);
    const totalRevenue = enrollData.reduce((s, c) => s + c.price * Number(c.enrollCount), 0);
    const totalReviews = reviewsData.length;
    const avgRating = totalReviews > 0
      ? (reviewsData.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
      : '0.0';

    res.json({
      totalCourses: Number(totalRow?.cnt ?? 0),
      publishedCourses: Number(publishedRow?.cnt ?? 0),
      totalEnrollments,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalReviews,
      avgRating,
    });
  } catch (error) {
    console.error('Get creator stats error:', error);
    res.status(500).json({ error: 'Failed to get creator stats' });
  }
});

// GET /analytics/learner-stats
router.get('/learner-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const enrollments = await query<any[]>(
      `SELECT e.id, e.userId, e.courseId, e.enrolledAt, c.id as c_id, c.title, c.coverImage
       FROM enrollments e JOIN courses c ON e.courseId = c.id
       WHERE e.userId = ?`,
      [userId]
    );

    if (enrollments.length === 0) {
      return res.json({
        totalCourses: 0, completedCourses: 0, inProgressCourses: 0,
        totalLessonsCompleted: 0, totalWatchHours: 0, enrollments: [],
      });
    }

    // Batch: lesson counts per course
    const courseIds = enrollments.map(e => e.courseId);
    const coursePh = courseIds.map(() => '?').join(',');
    const lessonCounts = await query<any[]>(
      `SELECT m.courseId, COUNT(l.id) as cnt
       FROM modules m JOIN lessons l ON l.moduleId = m.id
       WHERE m.courseId IN (${coursePh})
       GROUP BY m.courseId`,
      courseIds
    );
    const lessonCountMap: Record<string, number> = {};
    for (const row of lessonCounts) lessonCountMap[row.courseId] = Number(row.cnt);

    // Batch: all progress for all enrollments
    const enrollmentIds = enrollments.map(e => e.id);
    const enrPh = enrollmentIds.map(() => '?').join(',');
    const allProgress = await query<any[]>(
      `SELECT enrollmentId, progressPercent, completedAt, lastWatchedTimestamp
       FROM lesson_progress WHERE enrollmentId IN (${enrPh})`,
      enrollmentIds
    );
    const progressByEnrollment: Record<string, any[]> = {};
    for (const p of allProgress) {
      if (!progressByEnrollment[p.enrollmentId]) progressByEnrollment[p.enrollmentId] = [];
      progressByEnrollment[p.enrollmentId].push(p);
    }

    let totalCourses = enrollments.length;
    let completedCourses = 0;
    let inProgressCourses = 0;
    let totalLessonsCompleted = 0;
    let totalWatchTime = 0;
    const formattedEnrollments = [];

    for (const enr of enrollments) {
      const totalLessonsInCourse = lessonCountMap[enr.courseId] ?? 0;
      const progressRows = progressByEnrollment[enr.id] || [];

      const completedLessons = progressRows.filter(lp => lp.completedAt != null).length;
      totalLessonsCompleted += completedLessons;
      progressRows.forEach(lp => { totalWatchTime += Number(lp.lastWatchedTimestamp ?? 0); });

      const courseProgress = totalLessonsInCourse > 0
        ? Math.round((completedLessons / totalLessonsInCourse) * 100)
        : 0;

      if (totalLessonsInCourse > 0 && completedLessons === totalLessonsInCourse) {
        completedCourses++;
      } else if (progressRows.length > 0) {
        inProgressCourses++;
      }

      formattedEnrollments.push({
        id: enr.id, userId: enr.userId, courseId: enr.courseId,
        enrolledAt: enr.enrolledAt instanceof Date ? enr.enrolledAt.toISOString() : enr.enrolledAt,
        course: { id: enr.c_id, title: enr.title, coverImage: enr.coverImage },
        progress: courseProgress,
        lessonProgress: progressRows.map(lp => ({
          progressPercent: lp.progressPercent,
          completedAt: lp.completedAt ? (lp.completedAt instanceof Date ? lp.completedAt.toISOString() : lp.completedAt) : null,
        })),
      });
    }

    res.json({
      totalCourses, completedCourses, inProgressCourses, totalLessonsCompleted,
      totalWatchHours: Math.round((totalWatchTime / 3600) * 10) / 10,
      enrollments: formattedEnrollments,
    });
  } catch (error) {
    console.error('Get learner stats error:', error);
    res.status(500).json({ error: 'Failed to get learner stats' });
  }
});

export default router;
