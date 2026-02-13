import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

// GET /modules/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { position: 'asc' },
        },
        course: {
          select: { id: true, title: true, creatorId: true },
        },
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ module });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// PATCH /modules/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        course: { select: { creatorId: true } },
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    if (module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateModuleSchema.parse(req.body);

    const updated = await prisma.module.update({
      where: { id },
      data,
    });

    res.json({ module: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /modules/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        course: { select: { creatorId: true } },
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    if (module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.module.delete({ where: { id } });

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// PATCH /modules/:id/reorder - Reorder lessons within module
router.patch('/:id/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { lessonOrder } = req.body;

    if (!Array.isArray(lessonOrder)) {
      return res.status(400).json({ error: 'lessonOrder must be an array' });
    }

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        course: { select: { creatorId: true } },
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    if (module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Promise.all(
      lessonOrder.map((lessonId: string, index: number) =>
        prisma.lesson.update({
          where: { id: lessonId },
          data: { position: index },
        })
      )
    );

    res.json({ message: 'Lessons reordered' });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    res.status(500).json({ error: 'Failed to reorder lessons' });
  }
});

export default router;
