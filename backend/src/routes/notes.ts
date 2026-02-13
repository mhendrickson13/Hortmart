import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  timestampSeconds: z.number().int().min(0).optional(),
});

// GET /notes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only owner can view
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

// PATCH /notes/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = updateNoteSchema.parse(req.body);

    const updated = await prisma.note.update({
      where: { id },
      data,
    });

    res.json({ note: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /notes/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.note.delete({ where: { id } });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
