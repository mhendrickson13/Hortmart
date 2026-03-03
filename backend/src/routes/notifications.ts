import { Router, Response } from 'express';
import { query, queryOne, execute, genId, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

// ── Notification i18n ──
type Lang = 'es' | 'en' | 'fr' | 'pt';

/** Fetch the platform language from app_settings (defaults to 'es') */
async function getPlatformLang(): Promise<string> {
  try {
    const row = await queryOne<any>(`SELECT value FROM app_settings WHERE \`key\` = 'platformLanguage'`);
    return (row?.value || 'es').toLowerCase().slice(0, 2);
  } catch { return 'es'; }
}

/** Resolve language for a user by their ID */
async function getUserLangById(userId: string): Promise<Lang> {
  try {
    const row = await queryOne<any>('SELECT preferredLanguage FROM users WHERE id = ?', [userId]);
    if (row?.preferredLanguage) return row.preferredLanguage.toLowerCase().slice(0, 2) as Lang;
  } catch { /* fall through */ }
  return (await getPlatformLang()) as Lang;
}

/** Notification translation strings */
const nt: Record<string, Record<Lang, string>> = {
  'enrollment.title':           { es: 'Inscripción Confirmada',       en: 'Enrollment Confirmed',          fr: 'Inscription confirmée',           pt: 'Matrícula Confirmada' },
  'enrollment.desc':            { es: 'Te has inscrito al curso: "{courseTitle}".',  en: 'You have been enrolled in "{courseTitle}".', fr: 'Vous avez été inscrit(e) dans "{courseTitle}".', pt: 'Você foi matriculado(a) em "{courseTitle}".' },
  'newStudent.title':           { es: 'Nuevo Estudiante Inscrito',     en: 'New Student Enrolled',          fr: 'Nouvel étudiant inscrit',         pt: 'Novo Aluno Matriculado' },
  'newStudent.desc':            { es: 'Un nuevo estudiante se inscribió en "{courseTitle}".', en: 'A new student enrolled in "{courseTitle}".', fr: 'Un nouvel étudiant s\'est inscrit dans "{courseTitle}".', pt: 'Um novo aluno se matriculou em "{courseTitle}".' },
  'newStudent.external.desc':   { es: 'Un nuevo estudiante fue inscrito en "{courseTitle}" vía CXflow.', en: 'A new student was enrolled in "{courseTitle}" via CXflow.', fr: 'Un nouvel étudiant a été inscrit dans "{courseTitle}" via CXflow.', pt: 'Um novo aluno foi matriculado em "{courseTitle}" via CXflow.' },
  'module.title':               { es: '¡Módulo Completado! 📚',       en: 'Module Completed! 📚',           fr: 'Module terminé ! 📚',             pt: 'Módulo Concluído! 📚' },
  'module.desc':                { es: 'Has completado el módulo "{moduleTitle}" del curso "{courseTitle}".', en: 'You completed the module "{moduleTitle}" in "{courseTitle}".', fr: 'Vous avez terminé le module "{moduleTitle}" du cours "{courseTitle}".', pt: 'Você concluiu o módulo "{moduleTitle}" do curso "{courseTitle}".' },
  'course.title':               { es: '¡Curso Completado! 🎉',        en: 'Course Completed! 🎉',           fr: 'Cours terminé ! 🎉',              pt: 'Curso Concluído! 🎉' },
  'course.desc':                { es: '¡Felicidades! Has completado "{courseTitle}".', en: 'Congratulations! You have completed "{courseTitle}".', fr: 'Félicitations ! Vous avez terminé "{courseTitle}".', pt: 'Parabéns! Você concluiu "{courseTitle}".' },
  'review.title':               { es: 'Nueva Reseña del Curso',        en: 'New Course Review',              fr: 'Nouvel avis sur le cours',         pt: 'Nova Avaliação do Curso' },
  'review.desc':                { es: '{userName} dejó una reseña de {rating} estrellas en "{courseTitle}".', en: '{userName} left a {rating}-star review on "{courseTitle}".', fr: '{userName} a laissé un avis de {rating} étoiles sur "{courseTitle}".', pt: '{userName} deixou uma avaliação de {rating} estrelas em "{courseTitle}".' },
  'review.aStudent':            { es: 'Un estudiante', en: 'A student', fr: 'Un étudiant', pt: 'Um aluno' },
};

/** Get a translated notification string with interpolated params */
function notifText(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const map = nt[key];
  let text = map?.[lang] ?? map?.['es'] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // If userName is empty, fall back to translated "A student"
      const val = (k === 'userName' && !v) ? (nt['review.aStudent']?.[lang] ?? 'A student') : String(v);
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), val);
    }
  }
  return text;
}

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
    res.set('Cache-Control', 'private, max-age=30');
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
  /** i18n key for title — if set, auto-translates based on user's language */
  titleKey?: string;
  /** i18n key for description */
  descKey?: string;
  /** Interpolation params for title/desc keys */
  i18nParams?: Record<string, string | number>;
}) {
  try {
    // Check if user has in-app notifications enabled
    const userPref = await queryOne<any>('SELECT notifyInApp FROM users WHERE id = ?', [params.userId]);
    if (userPref && !userPref.notifyInApp) return; // User disabled in-app notifications

    // Resolve language and translate if i18n keys provided
    let title = params.title;
    let description = params.description;
    if (params.titleKey || params.descKey) {
      const lang = await getUserLangById(params.userId);
      if (params.titleKey) title = notifText(lang, params.titleKey, params.i18nParams);
      if (params.descKey) description = notifText(lang, params.descKey, params.i18nParams);
    }

    const id = genId();
    await execute(
      `INSERT INTO notifications (id, userId, type, title, description, link, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, false, NOW(3))`,
      [id, params.userId, params.type, title, description, params.link || null]
    );
  } catch (e) {
    // Non-critical: don't break the parent operation
    console.error('Failed to create notification:', e);
  }
}

export default router;
