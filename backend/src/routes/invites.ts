import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne, execute, genId } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

type CourseInviteTokenPayload = {
  type: 'course_invite';
  courseId: string;
  email: string;
  invitedById: string;
  iat?: number;
  exp?: number;
};

// POST /invites/accept
// Body: { token: string }
// Requires authentication; the logged-in user's email must match the invite email.
router.post('/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'token is required' });

    let payload: CourseInviteTokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as CourseInviteTokenPayload;
    } catch {
      return res.status(400).json({ error: 'Invalid or expired invite token' });
    }

    if (payload.type !== 'course_invite' || !payload.courseId || !payload.email) {
      return res.status(400).json({ error: 'Invalid invite token' });
    }

    const inviteEmail = String(payload.email).toLowerCase();
    const userEmail = String(req.user!.email).toLowerCase();
    if (inviteEmail !== userEmail) {
      return res.status(403).json({ error: 'This invite was sent to a different email address' });
    }

    const course = await queryOne<any>('SELECT id, title, status FROM courses WHERE id = ?', [payload.courseId]);
    if (!course || course.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Course not found' });
    }

    const existing = await queryOne<any>(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
      [req.user!.id, payload.courseId]
    );

    if (!existing) {
      await execute(
        'INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)',
        [genId(), req.user!.id, payload.courseId]
      );
    }

    res.json({
      success: true,
      courseId: payload.courseId,
      courseTitle: course.title,
      enrolled: true,
      alreadyEnrolled: !!existing,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

export default router;
