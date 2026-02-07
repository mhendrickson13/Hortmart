import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateAnswerSchema = z.object({
  content: z.string().min(1),
});

// GET /answers/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        question: {
          select: { id: true, content: true },
        },
      },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    res.json({ answer });
  } catch (error) {
    console.error('Get answer error:', error);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

// PATCH /answers/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({ where: { id } });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    if (answer.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateAnswerSchema.parse(req.body);

    const updated = await prisma.answer.update({
      where: { id },
      data,
    });

    res.json({ answer: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update answer error:', error);
    res.status(500).json({ error: 'Failed to update answer' });
  }
});

// DELETE /answers/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({ where: { id } });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    if (answer.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.answer.delete({ where: { id } });

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ error: 'Failed to delete answer' });
  }
});

// POST /answers/:id/accept
router.post('/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        question: true,
      },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Only question author can accept
    if (answer.question.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only question author can accept answers' });
    }

    // Unaccept any other accepted answers
    await prisma.answer.updateMany({
      where: {
        questionId: answer.questionId,
        isAccepted: true,
      },
      data: { isAccepted: false },
    });

    // Accept this answer
    const updated = await prisma.answer.update({
      where: { id },
      data: { isAccepted: true },
    });

    res.json({ answer: updated });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({ error: 'Failed to accept answer' });
  }
});

export default router;
