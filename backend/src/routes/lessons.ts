import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  position: z.number().int().min(0).optional(),
  isLocked: z.boolean().optional(),
  isFreePreview: z.boolean().optional(),
});

const updateProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
  lastWatchedTimestamp: z.number().int().min(0),
});

const createNoteSchema = z.object({
  content: z.string().min(1),
  timestampSeconds: z.number().int().min(0).optional(),
});

const createQuestionSchema = z.object({
  content: z.string().min(1),
});

const createResourceSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  url: z.string().url(),
  fileSize: z.number().int().min(0).optional(),
});

// GET /lessons/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        resources: true,
        module: {
          include: {
            course: {
              select: { id: true, title: true, creatorId: true, status: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check access for unpublished courses
    if (lesson.module.course.status !== 'PUBLISHED') {
      if (!req.user || (req.user.id !== lesson.module.course.creatorId && req.user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

// PATCH /lessons/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: { select: { creatorId: true } },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lesson.module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateLessonSchema.parse(req.body);

    const updated = await prisma.lesson.update({
      where: { id },
      data,
    });

    res.json({ lesson: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /lessons/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: { select: { creatorId: true } },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lesson.module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.lesson.delete({ where: { id } });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// GET /lessons/:id/progress
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled' });
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: id,
        },
      },
    });

    res.json({
      progress: progress || {
        progressPercent: 0,
        lastWatchedTimestamp: 0,
        lastWatchedAt: null,
        completedAt: null,
      },
    });
  } catch (error) {
    console.error('Get lesson progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// POST /lessons/:id/progress
router.post('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateProgressSchema.parse(req.body);

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled' });
    }

    const completedAt = data.progressPercent >= 90 ? new Date() : null;

    const progress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: id,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: id,
        progressPercent: data.progressPercent,
        lastWatchedTimestamp: data.lastWatchedTimestamp,
        lastWatchedAt: new Date(),
        completedAt,
      },
      update: {
        progressPercent: data.progressPercent,
        lastWatchedTimestamp: data.lastWatchedTimestamp,
        lastWatchedAt: new Date(),
        completedAt,
      },
    });

    res.json({ progress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update lesson progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// GET /lessons/:id/notes
router.get('/:id/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const notes = await prisma.note.findMany({
      where: {
        lessonId: id,
        userId: req.user!.id,
      },
      orderBy: { timestampSeconds: 'asc' },
    });

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// POST /lessons/:id/notes
router.post('/:id/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createNoteSchema.parse(req.body);

    const note = await prisma.note.create({
      data: {
        content: data.content,
        timestampSeconds: data.timestampSeconds || 0,
        userId: req.user!.id,
        lessonId: id,
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /lessons/:id/questions
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: { lessonId: id },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
          answers: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
            orderBy: [
              { isAccepted: 'desc' },
              { createdAt: 'asc' },
            ],
          },
          _count: {
            select: { answers: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.question.count({ where: { lessonId: id } }),
    ]);

    res.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// POST /lessons/:id/questions
router.post('/:id/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createQuestionSchema.parse(req.body);

    const question = await prisma.question.create({
      data: {
        content: data.content,
        userId: req.user!.id,
        lessonId: id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.status(201).json({ question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// GET /lessons/:id/resources
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;

    const resources = await prisma.resource.findMany({
      where: { lessonId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ resources });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

// POST /lessons/:id/resources
router.post('/:id/resources', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: { select: { creatorId: true } },
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lesson.module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = createResourceSchema.parse(req.body);

    const resource = await prisma.resource.create({
      data: {
        ...data,
        lessonId: id,
      },
    });

    res.status(201).json({ resource });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

export default router;
