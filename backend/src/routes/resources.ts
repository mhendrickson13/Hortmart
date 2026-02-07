import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateResourceSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  url: z.string().url().optional(),
  fileSize: z.number().int().min(0).optional(),
});

// GET /resources/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lesson: {
          select: { id: true, title: true },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ resource });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({ error: 'Failed to get resource' });
  }
});

// PATCH /resources/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: { select: { creatorId: true } },
              },
            },
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resource.lesson.module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateResourceSchema.parse(req.body);

    const updated = await prisma.resource.update({
      where: { id },
      data,
    });

    res.json({ resource: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE /resources/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: { select: { creatorId: true } },
              },
            },
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resource.lesson.module.course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.resource.delete({ where: { id } });

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
