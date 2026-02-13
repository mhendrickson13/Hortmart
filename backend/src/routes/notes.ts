import { Router, Response } from 'express';
import { queryOne, execute, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /notes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = await queryOne<any>('SELECT * FROM notes WHERE id = ?', [id]);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
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
    const note = await queryOne<any>('SELECT * FROM notes WHERE id = ?', [id]);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { content, timestampSeconds } = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    if (content !== undefined) { sets.push('content = ?'); params.push(content); }
    if (timestampSeconds !== undefined) { sets.push('timestampSeconds = ?'); params.push(timestampSeconds); }
    sets.push('updatedAt = ?'); params.push(now());
    params.push(id);

    await execute(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = await queryOne<any>('SELECT * FROM notes WHERE id = ?', [id]);

    res.json({ note: updated });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /notes/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = await queryOne<any>('SELECT * FROM notes WHERE id = ?', [id]);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
