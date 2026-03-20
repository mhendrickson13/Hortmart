/**
 * External API routes for CXflow workflow integrations.
 * Authenticated via Bearer token (stored in users.apiToken for each admin/creator).
 *
 * Usage from CXflow workflows:
 *   POST /e/external/create-learner
 *   Authorization: Bearer <token from Settings page>
 *   Content-Type: application/json
 *   {
 *     "usrmail": "learner@example.com",
 *     "usrname": "Full Name",
 *     "language": "es",
 *     "suscribedcourses": ["courseId1", "courseId2"]   // optional
 *   }
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne, execute, genId, now } from '../db.js';
import { sendAccountCreated, sendEnrollmentConfirmation } from '../email.js';
import { logActivity } from '../activity.js';
import { createNotification } from './notifications.js';

const router = Router();

// ── Bearer-token middleware — resolves the admin/creator account from apiToken ──
interface ExternalRequest extends Request {
  account?: { id: string; email: string; name: string | null; role: string };
}

async function requireBearerToken(req: ExternalRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty bearer token' });
  }

  const user = await queryOne<any>(
    "SELECT id, email, name, role FROM users WHERE apiToken = ? AND (role = 'ADMIN' OR role = 'CREATOR')",
    [token],
  );

  if (!user) {
    return res.status(403).json({ error: 'Invalid API token' });
  }

  req.account = user;
  next();
}

/**
 * POST /external/create-learner
 *
 * Creates a learner account and optionally enrols them in courses.
 *
 * Headers:
 *   Authorization: Bearer <api token from Settings>
 *
 * Body (JSON):
 *   usrmail          (string, required)  – learner email
 *   usrname          (string, optional)  – learner full name
 *   language         (string, optional)  – preferred language code: "es", "en", "fr", "pt"
 *   suscribedcourses (string[], optional) – course IDs to auto-enrol
 *
 * Response 201 (new user) / 200 (existing user):
 *   { user, enrollments, generatedPassword? }
 */
router.post('/create-learner', requireBearerToken, async (req: ExternalRequest, res: Response) => {
  try {
    const { usrmail, usrname, suscribedcourses, language } = req.body;
    const account = req.account!;

    // Normalise language code (accept es, en, fr, pt – case-insensitive)
    const validLangs = ['es', 'en', 'fr', 'pt'];
    const lang: string | null = language && validLangs.includes(String(language).toLowerCase().slice(0, 2))
      ? String(language).toLowerCase().slice(0, 2)
      : null;

    // ── Validate email ──
    if (!usrmail) {
      return res.status(400).json({ error: 'usrmail is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usrmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // ── Check existing user ──
    const existing = await queryOne<any>(
      'SELECT id, email, name, role, createdAt FROM users WHERE email = ?',
      [usrmail],
    );

    let userId: string;
    let isNew = false;
    let generatedPassword: string | undefined;

    if (existing) {
      userId = existing.id;
      // Update preferred language if provided and user doesn't have one yet
      if (lang) {
        await execute('UPDATE users SET preferredLanguage = COALESCE(preferredLanguage, ?), updatedAt = ? WHERE id = ?', [lang, now(), userId]);
      }
    } else {
      // Generate random password
      const pwd = crypto.randomBytes(8).toString('base64url').slice(0, 12);
      generatedPassword = pwd;

      const hashed = await bcrypt.hash(pwd, 10);
      userId = genId();
      const ts = now();
      isNew = true;

      await execute(
        'INSERT INTO users (id, email, password, name, role, preferredLanguage, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, usrmail, hashed, usrname || null, 'LEARNER', lang, ts],
      );

      // Send account-created email with temp password (await so Lambda doesn't freeze)
      try { await sendAccountCreated(usrmail, usrname || null, pwd); } catch (e) { console.error('[External] email failed:', e); }

      logActivity({
        event: 'user.created_by_admin',
        userId,
        userName: usrname || usrmail,
        meta: { email: usrmail, source: 'cxflow_api', createdBy: account.id },
      });
    }

    // ── Fetch user record ──
    const user = await queryOne<any>(
      'SELECT id, email, name, image, role, createdAt FROM users WHERE id = ?',
      [userId],
    );

    // ── Enrol in courses ──
    const enrollments: any[] = [];
    const courseIds: string[] = Array.isArray(suscribedcourses) ? suscribedcourses : [];

    for (const courseId of courseIds) {
      if (!courseId) continue;

      // Verify course exists & is published
      const course = await queryOne<any>(
        "SELECT id, title, creatorId FROM courses WHERE id = ? AND status = 'PUBLISHED'",
        [courseId],
      );
      if (!course) {
        enrollments.push({ courseId, status: 'not_found' });
        continue;
      }

      // Check if already enrolled
      const existingEnrollment = await queryOne<any>(
        'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
        [userId, courseId],
      );

      if (existingEnrollment) {
        enrollments.push({ courseId, status: 'already_enrolled' });
        continue;
      }

      // Create enrollment
      const enrollmentId = genId();
      await execute(
        'INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)',
        [enrollmentId, userId, courseId],
      );

      // Notify learner
      createNotification({
        userId,
        type: 'course',
        title: 'Enrollment Confirmed',
        description: `You have been enrolled in "${course.title}".`,
        link: `/player/${courseId}`,
        titleKey: 'enrollment.title',
        descKey: 'enrollment.desc',
        i18nParams: { courseTitle: course.title },
      });

      // Notify course creator
      if (course.creatorId) {
        createNotification({
          userId: course.creatorId,
          type: 'course',
          title: 'New Student Enrolled',
          description: `A new student was enrolled in "${course.title}" via CXflow.`,
          link: `/manage-courses/${courseId}/analytics`,
          titleKey: 'newStudent.title',
          descKey: 'newStudent.external.desc',
          i18nParams: { courseTitle: course.title },
        });
      }

      // Email learner about enrollment (await so Lambda doesn't freeze)
      try { await sendEnrollmentConfirmation(usrmail, usrname || user?.name, course.title, courseId); } catch (e) { console.error('[External] enrollment email failed:', e); }

      logActivity({
        event: 'enrollment.created',
        userId,
        userName: usrname || user?.name || usrmail,
        meta: { courseId, courseTitle: course.title, source: 'cxflow_api' },
      });

      enrollments.push({ courseId, courseTitle: course.title, status: 'enrolled' });
    }

    res.status(isNew ? 201 : 200).json({
      user,
      enrollments: enrollments.length > 0 ? enrollments : undefined,
      generatedPassword: generatedPassword || undefined,
      isNew,
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('External create-learner error:', error);
    res.status(500).json({ error: 'Failed to create learner' });
  }
});

export default router;
