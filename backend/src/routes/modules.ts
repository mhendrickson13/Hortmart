import { Router, Response } from 'express';
import { query, queryOne, execute, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /modules/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mod = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [id]);

    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const lessons = await query<any[]>(
      'SELECT * FROM lessons WHERE moduleId = ? ORDER BY position ASC',
      [id]
    );
    // Convert boolean fields
    lessons.forEach(l => { l.isLocked = !!l.isLocked; l.isFreePreview = !!l.isFreePreview; });

    const course = await queryOne<any>('SELECT id, title, creatorId FROM courses WHERE id = ?', [mod.courseId]);

    res.json({ module: { ...mod, lessons, course } });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// PATCH /modules/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const mod = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [id]);

    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, position } = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (position !== undefined) { sets.push('position = ?'); params.push(position); }
    sets.push('updatedAt = ?'); params.push(now());
    params.push(id);

    await execute(`UPDATE modules SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [id]);

    res.json({ module: updated });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /modules/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const mod = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [id]);

    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM modules WHERE id = ?', [id]);
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

    const mod = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [id]);
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ts = now();
    await Promise.all(
      lessonOrder.map((lessonId: string, index: number) =>
        execute('UPDATE lessons SET position = ?, updatedAt = ? WHERE id = ?', [index, ts, lessonId])
      )
    );

    res.json({ message: 'Lessons reordered' });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    res.status(500).json({ error: 'Failed to reorder lessons' });
  }
});

export default router;
