import { Router, Response } from 'express';
import { queryOne, execute, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await queryOne<any>('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const user = await queryOne<any>('SELECT id, name, image FROM users WHERE id = ?', [review.userId]);
    const course = await queryOne<any>('SELECT id, title FROM courses WHERE id = ?', [review.courseId]);

    res.json({ review: { ...review, user, course } });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to get review' });
  }
});

// PATCH /reviews/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const review = await queryOne<any>('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (review.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rating, comment } = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    if (rating !== undefined) { sets.push('rating = ?'); params.push(rating); }
    if (comment !== undefined) { sets.push('comment = ?'); params.push(comment); }
    sets.push('updatedAt = ?'); params.push(now());
    params.push(id);

    await execute(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = await queryOne<any>('SELECT * FROM reviews WHERE id = ?', [id]);

    res.json({ review: updated });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /reviews/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const review = await queryOne<any>('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (review.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
