import { Router, Response } from 'express';
import { query, queryOne, execute, genId } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /favourites/list - Get user's favourited and bookmarked courses
router.get('/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const favourites = await query<any[]>(
      `SELECT c.id, c.title, c.subtitle, c.coverImage, c.price, c.currency, c.level, c.category,
              c.status, c.createdAt, u.name as creatorName, u.image as creatorImage,
              s.type, s.createdAt as savedAt
       FROM user_course_saves s
       JOIN courses c ON s.courseId = c.id AND c.status = 'PUBLISHED'
       LEFT JOIN users u ON c.creatorId = u.id
       WHERE s.userId = ?
       ORDER BY s.createdAt DESC`,
      [userId]
    );

    const favCourses = favourites.filter(f => f.type === 'favourite').map(f => ({
      id: f.id, title: f.title, subtitle: f.subtitle, coverImage: f.coverImage,
      price: f.price, currency: f.currency, level: f.level, category: f.category,
      creator: { name: f.creatorName, image: f.creatorImage }, savedAt: f.savedAt,
    }));

    const bmCourses = favourites.filter(f => f.type === 'bookmark').map(f => ({
      id: f.id, title: f.title, subtitle: f.subtitle, coverImage: f.coverImage,
      price: f.price, currency: f.currency, level: f.level, category: f.category,
      creator: { name: f.creatorName, image: f.creatorImage }, savedAt: f.savedAt,
    }));

    res.json({ favourites: favCourses, bookmarks: bmCourses });
  } catch (error) {
    console.error('Get favourites list error:', error);
    res.status(500).json({ error: 'Failed to get favourites' });
  }
});

// GET /favourites/:courseId/status - Check if user has favourited/bookmarked a course
router.get('/:courseId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const fav = await queryOne<any>(
      'SELECT id FROM user_course_saves WHERE userId = ? AND courseId = ? AND type = ?',
      [userId, courseId, 'favourite']
    );
    const bm = await queryOne<any>(
      'SELECT id FROM user_course_saves WHERE userId = ? AND courseId = ? AND type = ?',
      [userId, courseId, 'bookmark']
    );

    res.json({ isFavourite: !!fav, isBookmarked: !!bm });
  } catch (error) {
    console.error('Get favourite status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /favourites/:courseId/favourite - Toggle favourite
router.post('/:courseId/favourite', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const existing = await queryOne<any>(
      'SELECT id FROM user_course_saves WHERE userId = ? AND courseId = ? AND type = ?',
      [userId, courseId, 'favourite']
    );

    if (existing) {
      await execute('DELETE FROM user_course_saves WHERE id = ?', [existing.id]);
      res.json({ isFavourite: false });
    } else {
      const id = genId();
      await execute(
        'INSERT INTO user_course_saves (id, userId, courseId, type, createdAt) VALUES (?, ?, ?, ?, NOW(3))',
        [id, userId, courseId, 'favourite']
      );
      res.json({ isFavourite: true });
    }
  } catch (error) {
    console.error('Toggle favourite error:', error);
    res.status(500).json({ error: 'Failed to toggle favourite' });
  }
});

// POST /favourites/:courseId/bookmark - Toggle bookmark
router.post('/:courseId/bookmark', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const existing = await queryOne<any>(
      'SELECT id FROM user_course_saves WHERE userId = ? AND courseId = ? AND type = ?',
      [userId, courseId, 'bookmark']
    );

    if (existing) {
      await execute('DELETE FROM user_course_saves WHERE id = ?', [existing.id]);
      res.json({ isBookmarked: false });
    } else {
      const id = genId();
      await execute(
        'INSERT INTO user_course_saves (id, userId, courseId, type, createdAt) VALUES (?, ?, ?, ?, NOW(3))',
        [id, userId, courseId, 'bookmark']
      );
      res.json({ isBookmarked: true });
    }
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

export default router;
