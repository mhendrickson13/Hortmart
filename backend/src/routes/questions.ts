import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateQuestionSchema = z.object({
  content: z.string().min(1),
});

const createAnswerSchema = z.object({
  content: z.string().min(1),
});

// GET /questions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
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
        lesson: {
          select: { id: true, title: true },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// PATCH /questions/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({ where: { id } });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (question.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateQuestionSchema.parse(req.body);

    const updated = await prisma.question.update({
      where: { id },
      data,
    });

    res.json({ question: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /questions/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({ where: { id } });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (question.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.question.delete({ where: { id } });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// POST /questions/:id/answers
router.post('/:id/answers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createAnswerSchema.parse(req.body);

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const answer = await prisma.answer.create({
      data: {
        content: data.content,
        userId: req.user!.id,
        questionId: id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.status(201).json({ answer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Failed to create answer' });
  }
});

export default router;
