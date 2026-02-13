import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../app.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  image: z.string().url().optional(),
  role: z.enum(['LEARNER', 'CREATOR', 'ADMIN']).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

// GET /users - List all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const where: any = {};

    // Note: SQLite doesn't support mode: 'insensitive', so we filter in-memory
    const searchQuery = search?.toLowerCase();
    
    if (role) {
      where.role = role;
    }

    let allUsers = await prisma.user.findMany({
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
      allUsers = allUsers.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(searchQuery)) ||
          u.email.toLowerCase().includes(searchQuery)
      );
    }

    const total = allUsers.length;
    const users = allUsers.slice((page - 1) * limit, page * limit);

    const userIds = users.map((u) => u.id);

    // Last activity: max of lastWatchedAt from lesson progress, fallback to user updatedAt
    const enrollmentsForUsers = await prisma.enrollment.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true },
    });
    const enrollmentIds = enrollmentsForUsers.map((e) => e.id);
    const lastWatched = enrollmentIds.length
      ? await prisma.lessonProgress.findMany({
          where: { enrollmentId: { in: enrollmentIds } },
          select: { lastWatchedAt: true, enrollmentId: true },
        })
      : [];
    const lastByEnrollment = new Map<string, Date | null>();
    for (const lp of lastWatched) {
      if (lp.lastWatchedAt) {
        const existing = lastByEnrollment.get(lp.enrollmentId);
        if (!existing || lp.lastWatchedAt > existing) {
          lastByEnrollment.set(lp.enrollmentId, lp.lastWatchedAt);
        }
      }
    }
    const enrollmentToUser = new Map(enrollmentsForUsers.map((e) => [e.id, e.userId]));
    const lastActiveByUser = new Map<string, Date>();
    for (const [eid, date] of lastByEnrollment) {
      if (!date) continue;
      const uid = enrollmentToUser.get(eid);
      if (uid) {
        const existing = lastActiveByUser.get(uid);
        if (!existing || date > existing) lastActiveByUser.set(uid, date);
      }
    }

    // Completed courses count per user (enrollment where all lessons completed)
    const enrollmentsWithProgress = await prisma.enrollment.findMany({
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
    const completedCountByUser = new Map<string, number>();
    for (const uid of userIds) completedCountByUser.set(uid, 0);
    for (const enr of enrollmentsWithProgress) {
      const totalLessons = enr.course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
      const completedLessons = enr.lessonProgress.filter((lp) => lp.completedAt != null).length;
      if (totalLessons > 0 && completedLessons === totalLessons) {
        completedCountByUser.set(enr.userId, (completedCountByUser.get(enr.userId) ?? 0) + 1);
      }
    }

    const usersWithStats = users.map((u) => {
      const lastActiveAt = lastActiveByUser.get(u.id) ?? (u as { updatedAt?: Date }).updatedAt ?? u.createdAt;
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
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /users/profile - Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// GET /users/profile/enrollments - Get current user's enrollments
router.get('/profile/enrollments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user!.id },
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
  } catch (error) {
    console.error('Get profile enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// PATCH /users/profile - Update current user profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);
    
    // Remove role if not admin
    if (req.user!.role !== 'ADMIN') {
      delete data.role;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PATCH /users/password - Change password
router.patch('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Cannot change password' });
    }

    const valid = await bcrypt.compare(data.currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /users/:id - Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admin or self can view
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
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
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const enrollmentIds = enrollments.map((e) => e.id);
    let lastActiveAt: Date | null = null;
    if (enrollmentIds.length > 0) {
      const latest = await prisma.lessonProgress.findFirst({
        where: { enrollmentId: { in: enrollmentIds } },
        orderBy: { lastWatchedAt: 'desc' },
        select: { lastWatchedAt: true },
      });
      lastActiveAt = latest?.lastWatchedAt ?? null;
    }
    const lastActive = lastActiveAt ?? (user as { updatedAt: Date }).updatedAt;

    res.json({
      user: {
        ...user,
        lastActiveAt: lastActive ? (lastActive instanceof Date ? lastActive.toISOString() : lastActive) : null,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /users/:id - Update user (Admin or self)
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admin or self can update
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateUserSchema.parse(req.body);
    
    // Only admin can change role
    if (req.user!.role !== 'ADMIN') {
      delete data.role;
    }

    const user = await prisma.user.update({
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /users/:id - Delete user (Admin or self)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admin or self can delete
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /users/:id/enrollments - Get user's enrollments
router.get('/:id/enrollments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admin or self can view
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const enrollments = await prisma.enrollment.findMany({
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
      const totalLessons = enrollment.course.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0
      );
      const completedLessons = enrollment.lessonProgress.filter(
        (lp) => lp.completedAt != null
      ).length;
      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      const lastActivityAt = enrollment.lessonProgress.reduce<Date | null>((max, lp) => {
        const d = lp.lastWatchedAt ?? lp.completedAt ?? lp.updatedAt;
        if (!d) return max;
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
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// POST /users - Create user (Admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const createUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2).optional(),
      role: z.enum(['LEARNER', 'CREATOR', 'ADMIN']).optional(),
    });

    const data = createUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
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
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /users/:id/block - Block a user (Admin only)
router.post('/:id/block', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Don't allow blocking yourself
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const user = await prisma.user.update({
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
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// POST /users/:id/unblock - Unblock a user (Admin only)
router.post('/:id/unblock', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.update({
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
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
