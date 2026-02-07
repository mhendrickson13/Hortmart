import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, requireCreatorOrAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  whatYouWillLearn: z.string().optional(), // JSON array of learning outcomes
  coverImage: z.string().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  category: z.string().optional(),
  language: z.string().optional(),
});

const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const createModuleSchema = z.object({
  title: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

const createLessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  position: z.number().int().min(0).optional(),
  isLocked: z.boolean().optional(),
  isFreePreview: z.boolean().optional(),
  moduleId: z.string(),
});

// GET /courses - List courses
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const mine = req.query.mine === 'true';
    let creatorId = req.query.creatorId as string;
    
    // Search and filter params
    const q = req.query.q as string;
    const category = req.query.category as string;
    const level = req.query.level as string;
    const priceRange = req.query.priceRange as string;
    const sort = req.query.sort as string;

    // If mine=true, filter by current user's courses
    if (mine && req.user) {
      creatorId = req.user.id;
    }

    const where: any = {};

    // If not authenticated or not the creator, only show published
    if (!req.user || (creatorId && creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
      where.status = 'PUBLISHED';
    } else if (status) {
      where.status = status;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    // Search query - For SQLite, we need to use raw filtering after fetch
    // or use LOWER() in raw query. Prisma's mode: 'insensitive' doesn't work with SQLite
    const searchQuery = q?.toLowerCase();

    // Category filter
    if (category && category !== 'all') {
      where.category = category;
    }

    // Level filter
    if (level && level !== 'all') {
      where.level = level;
    }

    // Price range filter
    if (priceRange && priceRange !== 'all') {
      if (priceRange === 'free') {
        where.price = 0;
      } else if (priceRange === 'paid') {
        where.price = { gt: 0 };
      } else if (priceRange.includes('-')) {
        const [min, max] = priceRange.split('-').map(Number);
        where.price = { gte: min, lte: max };
      } else if (priceRange.endsWith('+')) {
        const min = parseInt(priceRange);
        where.price = { gte: min };
      }
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'popular') orderBy = { enrollments: { _count: 'desc' } };
    else if (sort === 'price-low') orderBy = { price: 'asc' };
    else if (sort === 'price-high') orderBy = { price: 'desc' };
    else if (sort === 'title') orderBy = { title: 'asc' };

    // Fetch courses
    let allCourses = await prisma.course.findMany({
      where,
      include: {
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
        _count: {
          select: { enrollments: true, reviews: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy,
    });

    // Apply case-insensitive search filter (SQLite doesn't support mode: 'insensitive')
    if (searchQuery) {
      allCourses = allCourses.filter((course) => 
        course.title.toLowerCase().includes(searchQuery) ||
        course.subtitle?.toLowerCase().includes(searchQuery) ||
        course.description?.toLowerCase().includes(searchQuery)
      );
    }

    // Calculate total and apply pagination
    const total = allCourses.length;
    const courses = allCourses.slice((page - 1) * limit, page * limit);

    // Calculate additional fields
    const coursesWithStats = courses.map((course) => {
      const totalDuration = course.modules.reduce(
        (acc, m) => acc + m.lessons.reduce((a, l) => a + l.durationSeconds, 0),
        0
      );
      const avgRating = course.reviews.length > 0
        ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
        : null;

      return {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        coverImage: course.coverImage,
        price: course.price,
        currency: course.currency,
        status: course.status,
        level: course.level,
        category: course.category,
        language: course.language,
        createdAt: course.createdAt,
        publishedAt: course.publishedAt,
        creator: course.creator,
        _count: {
          modules: course.modules.length,
          enrollments: course._count.enrollments,
          reviews: course._count.reviews,
        },
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalDuration,
      };
    });

    res.json({
      courses: coursesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List courses error:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

// GET /courses/categories - Get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { 
        status: 'PUBLISHED',
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = courses
      .map((c) => c.category)
      .filter((c): c is string => c !== null);

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// GET /courses/search - Search courses
router.get('/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const q = req.query.q as string;
    const category = req.query.category as string;
    const level = req.query.level as string;
    const priceRange = req.query.priceRange as string;
    const sort = req.query.sort as string;

    const where: any = { status: 'PUBLISHED' };
    const searchQuery = q?.toLowerCase();

    if (category) {
      where.category = category;
    }

    if (level) {
      where.level = level;
    }

    if (priceRange) {
      if (priceRange === 'free') {
        where.price = 0;
      } else if (priceRange === 'paid') {
        where.price = { gt: 0 };
      } else if (priceRange.includes('-')) {
        const [min, max] = priceRange.split('-').map(Number);
        where.price = { gte: min, lte: max };
      } else if (priceRange.endsWith('+')) {
        const min = parseInt(priceRange);
        where.price = { gte: min };
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'popular') orderBy = { enrollments: { _count: 'desc' } };
    else if (sort === 'price-low') orderBy = { price: 'asc' };
    else if (sort === 'price-high') orderBy = { price: 'desc' };

    // Fetch all courses matching filters
    let allCourses = await prisma.course.findMany({
      where,
      include: {
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
        _count: {
          select: { enrollments: true, reviews: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy,
    });

    // Apply case-insensitive search filter (SQLite doesn't support mode: 'insensitive')
    if (searchQuery) {
      allCourses = allCourses.filter((course) => 
        course.title.toLowerCase().includes(searchQuery) ||
        course.subtitle?.toLowerCase().includes(searchQuery) ||
        course.description?.toLowerCase().includes(searchQuery)
      );
    }

    // Calculate total and apply pagination
    const total = allCourses.length;
    const courses = allCourses.slice((page - 1) * limit, page * limit);

    const coursesWithStats = courses.map((course) => {
      const totalDuration = course.modules.reduce(
        (acc, m) => acc + m.lessons.reduce((a, l) => a + l.durationSeconds, 0),
        0
      );
      const avgRating = course.reviews.length > 0
        ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
        : null;

      return {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        coverImage: course.coverImage,
        price: course.price,
        currency: course.currency,
        status: course.status,
        level: course.level,
        category: course.category,
        language: course.language,
        createdAt: course.createdAt,
        creator: course.creator,
        _count: {
          modules: course.modules.length,
          enrollments: course._count.enrollments,
          reviews: course._count.reviews,
        },
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalDuration,
      };
    });

    res.json({
      courses: coursesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Search courses error:', error);
    res.status(500).json({ error: 'Failed to search courses' });
  }
});

// POST /courses - Create course
router.post('/', authenticate, requireCreatorOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCourseSchema.parse(req.body);

    const course = await prisma.course.create({
      data: {
        ...data,
        creatorId: req.user!.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.status(201).json({ course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// GET /courses/:id - Get course details
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, image: true, bio: true },
        },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                resources: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true, reviews: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check access
    if (course.status !== 'PUBLISHED') {
      if (!req.user || (req.user.id !== course.creatorId && req.user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const totalDuration = course.modules.reduce(
      (acc, m) => acc + m.lessons.reduce((a, l) => a + l.durationSeconds, 0),
      0
    );
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const avgRating = course.reviews.length > 0
      ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
      : null;

    res.json({
      course: {
        ...course,
        reviews: undefined,
        _count: {
          ...course._count,
          modules: course.modules.length,
        },
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalDuration,
        totalLessons,
      },
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// PATCH /courses/:id - Update course
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check ownership
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateCourseSchema.parse(req.body);

    const updated = await prisma.course.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.json({ course: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /courses/:id - Delete course
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.course.delete({ where: { id } });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// POST /courses/:id/enroll - Enroll in course
router.post('/:id/enroll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course || course.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Already enrolled' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.user!.id,
        courseId: id,
      },
    });

    res.status(201).json({ enrollment });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// GET /courses/:id/enroll - Check enrollment status
router.get('/:id/enroll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
    });

    res.json({
      enrolled: !!enrollment,
      enrollment: enrollment || null,
    });
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// DELETE /courses/:id/enroll - Unenroll from course
router.delete('/:id/enroll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
    });

    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ error: 'Failed to unenroll' });
  }
});

// GET /courses/:id/progress - Get course player data with progress
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
      include: {
        lessonProgress: true,
        course: {
          include: {
            creator: {
              select: { id: true, name: true, image: true },
            },
            modules: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  orderBy: { position: 'asc' },
                  include: {
                    resources: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // Find last accessed lesson for current lesson
    const lastProgress = enrollment.lessonProgress
      .filter((lp) => lp.lastWatchedAt)
      .sort((a, b) => (b.lastWatchedAt?.getTime() || 0) - (a.lastWatchedAt?.getTime() || 0))[0];

    let currentLessonId: string | undefined;
    let initialTime = 0;

    if (lastProgress) {
      currentLessonId = lastProgress.lessonId;
      initialTime = lastProgress.lastWatchedTimestamp || 0;
    } else {
      // Find first available lesson
      for (const module of enrollment.course.modules) {
        if (module.lessons.length > 0) {
          currentLessonId = module.lessons[0].id;
          break;
        }
      }
    }

    // Build modules with progress
    const modules = enrollment.course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      position: module.position,
      lessons: module.lessons.map((lesson) => {
        const progress = enrollment.lessonProgress.find(
          (lp) => lp.lessonId === lesson.id
        );
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.videoUrl,
          durationSeconds: lesson.durationSeconds,
          position: lesson.position,
          isLocked: lesson.isLocked,
          isFreePreview: lesson.isFreePreview,
          resources: lesson.resources,
          progress: progress ? {
            id: progress.id,
            lessonId: progress.lessonId,
            enrollmentId: progress.enrollmentId,
            progressPercent: progress.progressPercent,
            completedAt: progress.completedAt?.toISOString() || null,
            lastWatchedAt: progress.lastWatchedAt?.toISOString() || null,
          } : null,
        };
      }),
    }));

    // Get other students (limit to 5)
    const otherEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId: id,
        userId: { not: req.user!.id },
      },
      take: 5,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const totalOtherStudents = await prisma.enrollment.count({
      where: {
        courseId: id,
        userId: { not: req.user!.id },
      },
    });

    res.json({
      id: enrollment.course.id,
      title: enrollment.course.title,
      creator: enrollment.course.creator,
      modules,
      currentLessonId,
      initialTime,
      enrollmentId: enrollment.id,
      otherStudents: otherEnrollments.map((e) => e.user),
      totalOtherStudents,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// POST /courses/:id/modules - Create module
router.post('/:id/modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = createModuleSchema.parse(req.body);

    // Get max position
    const maxPosition = await prisma.module.findFirst({
      where: { courseId: id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const module = await prisma.module.create({
      data: {
        ...data,
        courseId: id,
        position: data.position ?? (maxPosition?.position ?? -1) + 1,
      },
    });

    res.status(201).json({ module });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// POST /courses/:id/lessons - Create lesson
router.post('/:id/lessons', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = createLessonSchema.parse(req.body);

    // Verify module belongs to course
    const module = await prisma.module.findUnique({ where: { id: data.moduleId } });
    if (!module || module.courseId !== id) {
      return res.status(400).json({ error: 'Invalid module' });
    }

    // Get max position
    const maxPosition = await prisma.lesson.findFirst({
      where: { moduleId: data.moduleId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        ...data,
        position: data.position ?? (maxPosition?.position ?? -1) + 1,
      },
    });

    res.status(201).json({ lesson });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// PATCH /courses/:id/reorder - Reorder modules
router.patch('/:id/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { moduleOrder } = req.body;

    if (!Array.isArray(moduleOrder)) {
      return res.status(400).json({ error: 'moduleOrder must be an array' });
    }

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update positions
    await Promise.all(
      moduleOrder.map((moduleId: string, index: number) =>
        prisma.module.update({
          where: { id: moduleId },
          data: { position: index },
        })
      )
    );

    res.json({ message: 'Modules reordered' });
  } catch (error) {
    console.error('Reorder modules error:', error);
    res.status(500).json({ error: 'Failed to reorder modules' });
  }
});

// POST /courses/:id/publish - Publish course
router.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    res.json({ course: updated });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ error: 'Failed to publish course' });
  }
});

// DELETE /courses/:id/publish - Unpublish course
router.delete('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: 'DRAFT' },
    });

    res.json({ course: updated });
  } catch (error) {
    console.error('Unpublish course error:', error);
    res.status(500).json({ error: 'Failed to unpublish course' });
  }
});

// GET /courses/:id/reviews - Get course reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [reviews, total, allRatings] = await Promise.all([
      prisma.review.findMany({
        where: { courseId: id },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { courseId: id } }),
      prisma.review.findMany({
        where: { courseId: id },
        select: { rating: true },
      }),
    ]);

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach((r) => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    const averageRating = allRatings.length > 0
      ? allRatings.reduce((a, r) => a + r.rating, 0) / allRatings.length
      : 0;

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: total,
        distribution,
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// POST /courses/:id/reviews - Create review
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'Must be enrolled to review' });
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Already reviewed this course' });
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        userId: req.user!.id,
        courseId: id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.status(201).json({ review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /courses/:id/analytics - Get course analytics
router.get('/:id/analytics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            lessonProgress: true,
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        modules: {
          include: {
            lessons: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);
    const avgRating = course.reviews.length > 0
      ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
      : 0;

    // Calculate completion rates
    const studentProgress = course.enrollments.map((enrollment) => {
      const completed = enrollment.lessonProgress.filter((lp) => lp.completedAt).length;
      const progress = totalLessons > 0 ? (completed / totalLessons) * 100 : 0;
      return {
        userId: enrollment.user.id,
        name: enrollment.user.name,
        progress: Math.round(progress * 10) / 10,
        completedAt: completed === totalLessons ? enrollment.lessonProgress
          .filter((lp) => lp.completedAt)
          .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0]?.completedAt : null,
      };
    });

    const completedStudents = studentProgress.filter((s) => s.progress === 100).length;
    const completionRate = course.enrollments.length > 0
      ? (completedStudents / course.enrollments.length) * 100
      : 0;

    const averageProgress = studentProgress.length > 0
      ? studentProgress.reduce((a, s) => a + s.progress, 0) / studentProgress.length
      : 0;

    // Enrollment trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const enrollmentTrend = course.enrollments
      .filter((e) => e.enrolledAt >= thirtyDaysAgo)
      .reduce((acc, e) => {
        const date = e.enrolledAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const enrollmentTrendArray = Object.entries(enrollmentTrend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Lesson stats
    const lessonStats = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => {
        const lessonProgress = course.enrollments.flatMap((e) =>
          e.lessonProgress.filter((lp) => lp.lessonId === lesson.id)
        );
        const completed = lessonProgress.filter((lp) => lp.completedAt).length;
        const avgWatchTime = lessonProgress.length > 0
          ? lessonProgress.reduce((a, lp) => a + lp.lastWatchedTimestamp, 0) / lessonProgress.length
          : 0;

        return {
          lessonId: lesson.id,
          title: lesson.title,
          completionRate: course.enrollments.length > 0
            ? Math.round((completed / course.enrollments.length) * 100)
            : 0,
          averageWatchTime: Math.round(avgWatchTime),
          dropOffRate: 0, // Would need more data to calculate
        };
      })
    );

    const topStudents = studentProgress
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10);

    res.json({
      analytics: {
        courseId: id,
        overview: {
          totalEnrollments: course.enrollments.length,
          activeStudents: studentProgress.filter((s) => s.progress > 0 && s.progress < 100).length,
          completionRate: Math.round(completionRate * 10) / 10,
          averageProgress: Math.round(averageProgress * 10) / 10,
          averageRating: Math.round(avgRating * 10) / 10,
          totalRevenue: course.enrollments.length * course.price,
        },
        enrollmentTrend: enrollmentTrendArray,
        lessonStats,
        topStudents,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
