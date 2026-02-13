import { Router, Response } from 'express';
import { query, queryOne, execute, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /answers/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const answer = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const user = await queryOne<any>('SELECT id, name, image FROM users WHERE id = ?', [answer.userId]);
    const question = await queryOne<any>('SELECT id, content FROM questions WHERE id = ?', [answer.questionId]);

    answer.isAccepted = !!answer.isAccepted;
    res.json({ answer: { ...answer, user, question } });
  } catch (error) {
    console.error('Get answer error:', error);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

// PATCH /answers/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const answer = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    if (answer.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    await execute('UPDATE answers SET content = ?, updatedAt = ? WHERE id = ?', [content, now(), id]);
    const updated = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);
    updated.isAccepted = !!updated.isAccepted;

    res.json({ answer: updated });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({ error: 'Failed to update answer' });
  }
});

// DELETE /answers/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const answer = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    if (answer.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM answers WHERE id = ?', [id]);
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
    const answer = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [answer.questionId]);
    if (!question || question.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Only question author can accept answers' });
    }

    const ts = now();
    // Unaccept any other accepted answers for this question
    await execute('UPDATE answers SET isAccepted = false, updatedAt = ? WHERE questionId = ? AND isAccepted = true', [ts, answer.questionId]);
    // Accept this answer
    await execute('UPDATE answers SET isAccepted = true, updatedAt = ? WHERE id = ?', [ts, id]);

    const updated = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [id]);
    updated.isAccepted = !!updated.isAccepted;

    res.json({ answer: updated });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({ error: 'Failed to accept answer' });
  }
});

export default router;
