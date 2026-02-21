import { Router, Response } from 'express';
import { query, queryOne, execute, genId, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /notifications - List user's notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;

    const notifications = await query<any[]>(
      `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
      [req.user!.id, limit]
    );

    const unreadRow = await queryOne<any>(
      'SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = false',
      [req.user!.id]
    );

    // Convert boolean
    notifications.forEach(n => { n.isRead = !!n.isRead; });

    res.json({
      notifications,
      unreadCount: Number(unreadRow?.cnt ?? 0),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// GET /notifications/unread-count - Quick count for badge
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const row = await queryOne<any>(
      'SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = false',
      [req.user!.id]
    );
    res.json({ count: Number(row?.cnt ?? 0) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// PATCH /notifications/read-all - Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await execute(
      'UPDATE notifications SET isRead = true WHERE userId = ? AND isRead = false',
      [req.user!.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// PATCH /notifications/:id/read - Mark one as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      'UPDATE notifications SET isRead = true WHERE id = ? AND userId = ?',
      [id, req.user!.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// DELETE /notifications/:id - Delete one notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute(
      'DELETE FROM notifications WHERE id = ? AND userId = ?',
      [id, req.user!.id]
    );
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ── Helper: create a notification (called from other routes) ──
export async function createNotification(params: {
  userId: string;
  type: 'course' | 'review' | 'achievement' | 'system';
  title: string;
  description: string;
  link?: string;
}) {
  try {
    const id = genId();
    await execute(
      `INSERT INTO notifications (id, userId, type, title, description, link, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, false, NOW(3))`,
      [id, params.userId, params.type, params.title, params.description, params.link || null]
    );
  } catch (e) {
    // Non-critical: don't break the parent operation
    console.error('Failed to create notification:', e);
  }
}

export default router;
