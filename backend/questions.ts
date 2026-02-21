import { Router, Response } from 'express';
import { query, queryOne, execute, genId, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /questions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [id]);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const user = await queryOne<any>('SELECT id, name, image FROM users WHERE id = ?', [question.userId]);
    const lesson = await queryOne<any>('SELECT id, title FROM lessons WHERE id = ?', [question.lessonId]);
    const answers = await query<any[]>(
      `SELECT a.*, u.id as u_id, u.name as u_name, u.image as u_image
       FROM answers a LEFT JOIN users u ON a.userId = u.id
       WHERE a.questionId = ?
       ORDER BY a.isAccepted DESC, a.createdAt ASC`,
      [id]
    );

    const formattedAnswers = answers.map(a => ({
      id: a.id, content: a.content, userId: a.userId, questionId: a.questionId,
      isAccepted: !!a.isAccepted, createdAt: a.createdAt, updatedAt: a.updatedAt,
      user: { id: a.u_id, name: a.u_name, image: a.u_image },
    }));

    res.json({ question: { ...question, user, lesson, answers: formattedAnswers } });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// PATCH /questions/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [id]);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (question.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    await execute('UPDATE questions SET content = ?, updatedAt = ? WHERE id = ?', [content, now(), id]);
    const updated = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [id]);

    res.json({ question: updated });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /questions/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [id]);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    if (question.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM questions WHERE id = ?', [id]);
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
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [id]);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Enrollment check: user must be enrolled (or be admin/creator)
    const lessonRow = await queryOne<any>('SELECT moduleId FROM lessons WHERE id = ?', [question.lessonId]);
    const modRow = lessonRow ? await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lessonRow.moduleId]) : null;
    const courseRow = modRow ? await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [modRow.courseId]) : null;
    const isCreatorOrAdmin = courseRow && (courseRow.creatorId === req.user!.id || req.user!.role === 'ADMIN');
    if (!isCreatorOrAdmin) {
      const enrollment = await queryOne<any>(
        'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
        [req.user!.id, modRow?.courseId]
      );
      if (!enrollment) return res.status(403).json({ error: 'Must be enrolled to post answers' });
    }

    const answerId = genId();
    const ts = now();

    await execute(
      'INSERT INTO answers (id, content, userId, questionId, isAccepted, updatedAt) VALUES (?, ?, ?, ?, false, ?)',
      [answerId, content, req.user!.id, id, ts]
    );

    const answer = await queryOne<any>('SELECT * FROM answers WHERE id = ?', [answerId]);
    const user = await queryOne<any>('SELECT id, name, image FROM users WHERE id = ?', [req.user!.id]);
    answer!.isAccepted = !!answer!.isAccepted;

    res.status(201).json({ answer: { ...answer, user } });
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Failed to create answer' });
  }
});

export default router;
