import { Router, Response } from 'express';
import { query, queryOne, execute, genId, now } from '../db.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { sendCourseCompleted, sendModuleCompleted, sendCourseCertificate } from '../email.js';
import { createNotification } from './notifications.js';
import { logActivity, fireWebhook } from '../activity.js';

const router = Router();

// ── Video event types dispatched to webhook ──
const VALID_VIDEO_EVENTS = ['play', 'pause', 'ended', 'seeked', 'ratechange', 'visibilitychange'] as const;

// POST /lessons/video-event — Dispatch video player events to webhook
router.post('/video-event', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { event, lessonId, courseId, currentTime, duration, playbackRate, visibilityState } = req.body;

    if (!event || !VALID_VIDEO_EVENTS.includes(event)) {
      return res.status(400).json({ error: `Invalid event. Must be one of: ${VALID_VIDEO_EVENTS.join(', ')}` });
    }
    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    const user = await queryOne<any>('SELECT name, email FROM users WHERE id = ?', [req.user!.id]);
    const course = courseId ? await queryOne<any>('SELECT title FROM courses WHERE id = ?', [courseId]) : null;
    const lesson = lessonId ? await queryOne<any>('SELECT title FROM lessons WHERE id = ?', [lessonId]) : null;

    const payload: Record<string, any> = {
      event,
      userId: req.user!.id,
      userName: user?.name || user?.email || req.user!.email,
      userEmail: user?.email || req.user!.email,
      lessonId,
      lessonName: lesson?.title || null,
      courseId: courseId || null,
      courseName: course?.title || null,
      currentTime: currentTime ?? 0,
      duration: duration ?? 0,
      timestamp: new Date().toISOString(),
    };

    if (event === 'ratechange' && playbackRate !== undefined) {
      payload.playbackRate = playbackRate;
    }
    if (event === 'visibilitychange' && visibilityState !== undefined) {
      payload.visibilityState = visibilityState;
    }

    fireWebhook(payload).catch(() => {});

    // Log seeked events to activity history
    if (event === 'seeked') {
      logActivity({ event: 'seeked', userId: req.user!.id, userName: user?.name || user?.email || req.user!.email, meta: { lessonId, lessonTitle: lesson?.title, courseId: courseId || null, courseTitle: course?.title || null, currentTime: currentTime ?? 0 } });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Video event error:', error);
    res.status(500).json({ error: 'Failed to process video event' });
  }
});

// GET /lessons/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await queryOne<any>('SELECT * FROM lessons WHERE id = ?', [id]);

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    lesson.isLocked = !!lesson.isLocked;
    lesson.isFreePreview = !!lesson.isFreePreview;
    lesson.qaEnabled = lesson.qaEnabled === undefined ? true : !!lesson.qaEnabled;
    lesson.notesEnabled = lesson.notesEnabled === undefined ? true : !!lesson.notesEnabled;

    // Get module + course info for access check
    const mod = await queryOne<any>('SELECT * FROM modules WHERE id = ?', [lesson.moduleId]);
    const course = await queryOne<any>('SELECT id, title, creatorId, status FROM courses WHERE id = ?', [mod?.courseId]);

    if (course && course.status !== 'PUBLISHED') {
      if (!req.user || (req.user.id !== course.creatorId && req.user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const resources = await query<any[]>('SELECT * FROM resources WHERE lessonId = ? ORDER BY createdAt ASC', [id]);

    res.json({
      lesson: {
        ...lesson,
        resources,
        module: { ...mod, course },
      },
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

// PATCH /lessons/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await queryOne<any>('SELECT * FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, videoUrl, durationSeconds, position, isLocked, isFreePreview, qaEnabled, notesEnabled } = req.body;
    const sets: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (videoUrl !== undefined) { sets.push('videoUrl = ?'); params.push(videoUrl); }
    if (durationSeconds !== undefined) { sets.push('durationSeconds = ?'); params.push(durationSeconds); }
    if (position !== undefined) { sets.push('position = ?'); params.push(position); }
    if (isLocked !== undefined) { sets.push('isLocked = ?'); params.push(isLocked); }
    if (isFreePreview !== undefined) { sets.push('isFreePreview = ?'); params.push(isFreePreview); }
    if (qaEnabled !== undefined) { sets.push('qaEnabled = ?'); params.push(qaEnabled); }
    if (notesEnabled !== undefined) { sets.push('notesEnabled = ?'); params.push(notesEnabled); }
    sets.push('updatedAt = ?'); params.push(now());
    params.push(id);

    await execute(`UPDATE lessons SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = await queryOne<any>('SELECT * FROM lessons WHERE id = ?', [id]);
    if (updated) {
      updated.isLocked = !!updated.isLocked;
      updated.isFreePreview = !!updated.isFreePreview;
      updated.qaEnabled = updated.qaEnabled === undefined ? true : !!updated.qaEnabled;
      updated.notesEnabled = updated.notesEnabled === undefined ? true : !!updated.notesEnabled;
    }

    // ── Auto-trigger encoding when a new S3 video is set ──
    if (videoUrl && typeof videoUrl === 'string' && videoUrl !== lesson.videoUrl) {
      const isS3Url = videoUrl.includes('cxflowio') && videoUrl.includes('amazonaws.com');
      if (isS3Url) {
        // Fire-and-forget: submit encoding in background
        (async () => {
          try {
            const videoMod = await import('./video.js');
            const sourceKey = videoMod.extractS3Key(videoUrl);
            if (!sourceKey) return;
            console.log(`[LESSONS] Auto-encoding lesson ${id}, key: ${sourceKey}`);
            const jobId = await videoMod.submitEncodingJob(sourceKey, id);
            // hlsUrl set to NULL — will be populated by checkAndFinalizeEncoding on completion
            await execute(
              'UPDATE lessons SET videoStatus = ?, encodingJobId = ?, hlsUrl = NULL, updatedAt = ? WHERE id = ?',
              ['encoding', jobId, now(), id]
            );
            console.log(`[LESSONS] Auto-encoding started, job: ${jobId}`);
          } catch (err) {
            console.error(`[LESSONS] Auto-encoding failed for lesson ${id}:`, err);
            // Update status so frontend can show the error (instead of polling forever)
            try {
              await execute(
                'UPDATE lessons SET videoStatus = ?, updatedAt = ? WHERE id = ?',
                ['error', now(), id]
              );
            } catch { /* ignore secondary error */ }
          }
        })();
      }
    }

    res.json({ lesson: updated });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /lessons/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await queryOne<any>('SELECT * FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execute('DELETE FROM lessons WHERE id = ?', [id]);
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// GET /lessons/:id/progress
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await queryOne<any>('SELECT moduleId FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const enrollment = await queryOne<any>(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
      [req.user!.id, mod?.courseId]
    );
    if (!enrollment) return res.status(404).json({ error: 'Not enrolled' });

    const progress = await queryOne<any>(
      'SELECT * FROM lesson_progress WHERE enrollmentId = ? AND lessonId = ?',
      [enrollment.id, id]
    );

    res.json({
      progress: progress || {
        progressPercent: 0,
        lastWatchedTimestamp: 0,
        lastWatchedAt: null,
        completedAt: null,
      },
    });
  } catch (error) {
    console.error('Get lesson progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// POST /lessons/:id/progress
router.post('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { progressPercent: rawProgress, lastWatchedTimestamp, watchedSeconds: rawWatched, viewCountIncrement } = req.body;

    if (rawProgress === undefined || lastWatchedTimestamp === undefined) {
      return res.status(400).json({ error: 'progressPercent and lastWatchedTimestamp are required' });
    }

    // Clamp progressPercent to 0-100
    const progressPercent = Math.max(0, Math.min(100, Number(rawProgress) || 0));
    // Validate lastWatchedTimestamp
    const validTimestamp = Math.max(0, Math.floor(Number(lastWatchedTimestamp) || 0));
    // Validate watchedSeconds (accumulated real watch time)
    const watchedSecondsIncrement = Math.max(0, Math.floor(Number(rawWatched) || 0));
    // viewCount increment (1 when a new play-from-start occurs)
    const viewInc = Number(viewCountIncrement) === 1 ? 1 : 0;

    const lesson = await queryOne<any>('SELECT moduleId, durationSeconds, title FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const enrollment = await queryOne<any>(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
      [req.user!.id, mod?.courseId]
    );
    if (!enrollment) return res.status(404).json({ error: 'Not enrolled' });

    const ts = now();

    // Upsert: try update first, then insert
    const existing = await queryOne<any>(
      'SELECT id, watchedSeconds, completedAt FROM lesson_progress WHERE enrollmentId = ? AND lessonId = ?',
      [enrollment.id, id]
    );

    // Compute new total watched seconds (accumulate, never decrease)
    const existingWatched = Number(existing?.watchedSeconds ?? 0);
    const newWatchedTotal = existingWatched + watchedSecondsIncrement;

    // Mark complete: video ended (100%) OR watched >= 95% of duration
    // If no duration known, fall back to position-based threshold (100%)
    const dur = Number(lesson.durationSeconds) || 0;
    let completedAt: string | null = null;
    if (!existing?.completedAt) {
      if (progressPercent >= 100) {
        // Video reported as fully played (ended event)
        completedAt = ts;
      } else if (dur > 0 && newWatchedTotal >= dur * 0.95) {
        // Watched 95% of actual duration
        completedAt = ts;
      }
    }

    if (existing) {
      await execute(
        `UPDATE lesson_progress SET
          progressPercent = GREATEST(progressPercent, ?),
          lastWatchedTimestamp = ?,
          lastWatchedAt = ?,
          completedAt = COALESCE(completedAt, ?),
          watchedSeconds = watchedSeconds + ?,
          viewCount = viewCount + ?,
          updatedAt = ?
        WHERE id = ?`,
        [progressPercent, validTimestamp, ts, completedAt, watchedSecondsIncrement, viewInc, ts, existing.id]
      );
    } else {
      const progressId = genId();
      await execute(
        `INSERT INTO lesson_progress (id, enrollmentId, lessonId, progressPercent, lastWatchedTimestamp, lastWatchedAt, completedAt, watchedSeconds, viewCount, firstViewedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [progressId, enrollment.id, id, progressPercent, validTimestamp, ts, completedAt, watchedSecondsIncrement, viewInc > 0 ? 1 : 0, ts, ts]
      );
      // First time this lesson is viewed
      logActivity({ event: 'lesson.started', userId: req.user!.id, userName: req.user!.email, meta: { lessonId: id, lessonTitle: lesson.title, courseId: mod.courseId } });
    }

    const progress = await queryOne<any>(
      'SELECT * FROM lesson_progress WHERE enrollmentId = ? AND lessonId = ?',
      [enrollment.id, id]
    );

    // ── Accumulate daily watch activity ──
    if (watchedSecondsIncrement > 0) {
      try {
        // Use CST (America/Chicago) date so chart aligns with user's local day
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD in CST
        console.log('[Progress] watch_activity: userId=', req.user!.id, 'courseId=', mod.courseId, 'today=', today, 'increment=', watchedSecondsIncrement);
        const existingActivity = await queryOne<any>(
          'SELECT id FROM watch_activity WHERE userId = ? AND courseId = ? AND activityDate = ?',
          [req.user!.id, mod.courseId, today]
        );
        if (existingActivity) {
          await execute(
            'UPDATE watch_activity SET watchedSeconds = watchedSeconds + ?, updatedAt = ? WHERE id = ?',
            [watchedSecondsIncrement, ts, existingActivity.id]
          );
        } else {
          await execute(
            'INSERT INTO watch_activity (id, userId, courseId, activityDate, watchedSeconds, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [genId(), req.user!.id, mod.courseId, today, watchedSecondsIncrement, ts]
          );
        }
      } catch (e) { console.warn('[Progress] watch_activity upsert error:', e); }
    }

    // ── Course completion detection ──
    // Only check if THIS lesson was just marked complete (completedAt was set in this request)
    if (completedAt) {
      const user = await queryOne<any>('SELECT email, name, notifyEmailCompletion FROM users WHERE id = ?', [req.user!.id]);
      const course = await queryOne<any>('SELECT title FROM courses WHERE id = ?', [mod.courseId]);

      // Webhook: lesson.completed
      logActivity({ event: 'lesson.completed', userId: req.user!.id, userName: user?.name || req.user!.email, meta: { lessonId: id, lessonTitle: lesson.title, courseId: mod.courseId, courseTitle: course?.title } });
      fireWebhook({
        event: 'lesson.completed',
        userId: req.user!.id,
        userName: user?.name || req.user!.email,
        userEmail: user?.email || req.user!.email,
        lessonId: id,
        lessonName: lesson.title || null,
        courseId: mod.courseId,
        courseName: course?.title || null,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      // ── Module completion detection ──
      try {
        const moduleInfo = await queryOne<any>('SELECT id, title FROM modules WHERE id = ?', [lesson.moduleId]);
        if (moduleInfo) {
          const totalModuleLessonsRow = await queryOne<any>(
            'SELECT COUNT(*) as cnt FROM lessons WHERE moduleId = ?',
            [moduleInfo.id]
          );
          const completedModuleLessonsRow = await queryOne<any>(
            `SELECT COUNT(*) as cnt FROM lesson_progress lp
             JOIN lessons l ON lp.lessonId = l.id
             WHERE l.moduleId = ? AND lp.enrollmentId = ? AND lp.completedAt IS NOT NULL`,
            [moduleInfo.id, enrollment.id]
          );
          const totalModuleLessons = Number(totalModuleLessonsRow?.cnt ?? 0);
          const completedModuleLessons = Number(completedModuleLessonsRow?.cnt ?? 0);

          if (totalModuleLessons > 0 && completedModuleLessons >= totalModuleLessons) {
            logActivity({ event: 'module.completed', userId: req.user!.id, userName: user?.name || req.user!.email, meta: { moduleId: moduleInfo.id, moduleTitle: moduleInfo.title, courseId: mod.courseId, courseTitle: course?.title } });

            // Webhook: module.completed
            fireWebhook({
              event: 'module.completed',
              userId: req.user!.id,
              userName: user?.name || req.user!.email,
              userEmail: user?.email || req.user!.email,
              moduleId: moduleInfo.id,
              moduleTitle: moduleInfo.title,
              courseId: mod.courseId,
              courseName: course?.title || null,
              timestamp: new Date().toISOString(),
            }).catch(() => {});

            // Module completion email
            if (user && course && user.notifyEmailCompletion) {
              try { await sendModuleCompleted(user.email, user.name, moduleInfo.title, course.title, mod.courseId); } catch (e) { console.error('[Module] email error:', e); }
            }

            // Notify learner
            createNotification({
              userId: req.user!.id,
              type: 'achievement',
              title: '¡Módulo Completado! 📚',
              description: `Has completado el módulo "${moduleInfo.title}" del curso "${course?.title}".`,
              link: `/player/${mod.courseId}`,
            });

            console.log(`[Module] User ${req.user!.id} completed module ${moduleInfo.id} "${moduleInfo.title}"`);
          }
        }
      } catch (e) { console.warn('[Module] completion check error:', e); }

      // ── Course completion detection ──
      try {
        // Count total lessons in this course vs completed lessons for this enrollment
        const totalRow = await queryOne<any>(
          `SELECT COUNT(*) as cnt FROM lessons l JOIN modules m ON l.moduleId = m.id WHERE m.courseId = ?`,
          [mod.courseId]
        );
        const completedRow = await queryOne<any>(
          `SELECT COUNT(*) as cnt FROM lesson_progress WHERE enrollmentId = ? AND completedAt IS NOT NULL`,
          [enrollment.id]
        );
        const totalLessons = Number(totalRow?.cnt ?? 0);
        const completedLessons = Number(completedRow?.cnt ?? 0);

        if (totalLessons > 0 && completedLessons >= totalLessons) {
          // Update enrollment completedAt
          const courseCompletedAt = now();
          await execute(
            'UPDATE enrollments SET completedAt = COALESCE(completedAt, ?) WHERE id = ?',
            [courseCompletedAt, enrollment.id]
          ).catch(() => {});

          if (user && course) {
            // Send course completed email
            if (user.notifyEmailCompletion) {
              try { await sendCourseCompleted(user.email, user.name, course.title); } catch (e) { console.error('[Completion] email error:', e); }
            }
            // Send certificate email (always — this is the constancia)
            try { await sendCourseCertificate(user.email, user.name, course.title, courseCompletedAt); } catch (e) { console.error('[Certificate] email error:', e); }

            // Create in-app notification
            createNotification({
              userId: req.user!.id,
              type: 'achievement',
              title: '¡Curso Completado! 🎉',
              description: `¡Felicidades! Has completado "${course.title}".`,
              link: `/courses/${mod.courseId}`,
            });
          }

          logActivity({ event: 'course.completed', userId: req.user!.id, userName: user?.name || req.user!.email, meta: { courseId: mod.courseId, courseTitle: course?.title } });

          // Webhook: course.completed
          fireWebhook({
            event: 'course.completed',
            userId: req.user!.id,
            userName: user?.name || req.user!.email,
            userEmail: user?.email || req.user!.email,
            courseId: mod.courseId,
            courseName: course?.title || null,
            timestamp: new Date().toISOString(),
          }).catch(() => {});

          console.log(`[Completion] User ${req.user!.id} completed course ${mod.courseId} (${completedLessons}/${totalLessons} lessons)`);
        }
      } catch (e) { console.warn('[Completion] check error:', e); }
    }

    res.json({ progress });
  } catch (error) {
    console.error('Update lesson progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// GET /lessons/:id/notes
router.get('/:id/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await query<any[]>(
      'SELECT * FROM notes WHERE lessonId = ? AND userId = ? ORDER BY timestampSeconds ASC',
      [id, req.user!.id]
    );
    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// POST /lessons/:id/notes
router.post('/:id/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, timestampSeconds } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    // Enrollment check: user must be enrolled in the course
    const lesson = await queryOne<any>('SELECT moduleId FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const enrollment = await queryOne<any>(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
      [req.user!.id, mod?.courseId]
    );
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

    const noteId = genId();
    const ts = now();
    await execute(
      'INSERT INTO notes (id, content, timestampSeconds, userId, lessonId, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [noteId, content, timestampSeconds || 0, req.user!.id, id, ts]
    );

    const note = await queryOne<any>('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /lessons/:id/questions
router.get('/:id/questions', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const totalRow = await queryOne<any>('SELECT COUNT(*) as cnt FROM questions WHERE lessonId = ?', [id]);
    const total = Number(totalRow?.cnt ?? 0);

    const questions = await query<any[]>(
      `SELECT q.*, u.id as u_id, u.name as u_name, u.image as u_image
       FROM questions q
       LEFT JOIN users u ON q.userId = u.id
       WHERE q.lessonId = ?
       ORDER BY q.createdAt DESC
       LIMIT ? OFFSET ?`,
      [id, limit, (page - 1) * limit]
    );

    // Fetch answers for all questions
    const qIds = questions.map(q => q.id);
    let answersMap = new Map<string, any[]>();
    let answerCountMap = new Map<string, number>();

    if (qIds.length > 0) {
      const ph = qIds.map(() => '?').join(', ');
      const answers = await query<any[]>(
        `SELECT a.*, u.id as u_id, u.name as u_name, u.image as u_image
         FROM answers a LEFT JOIN users u ON a.userId = u.id
         WHERE a.questionId IN (${ph})
         ORDER BY a.isAccepted DESC, a.createdAt ASC`,
        qIds
      );

      for (const a of answers) {
        const key = a.questionId;
        if (!answersMap.has(key)) answersMap.set(key, []);
        answersMap.get(key)!.push({
          id: a.id, content: a.content, userId: a.userId, questionId: a.questionId,
          isAccepted: !!a.isAccepted, createdAt: a.createdAt, updatedAt: a.updatedAt,
          user: { id: a.u_id, name: a.u_name, image: a.u_image },
        });
        answerCountMap.set(key, (answerCountMap.get(key) ?? 0) + 1);
      }
    }

    const formatted = questions.map(q => ({
      id: q.id, content: q.content, userId: q.userId, lessonId: q.lessonId,
      createdAt: q.createdAt, updatedAt: q.updatedAt,
      user: { id: q.u_id, name: q.u_name, image: q.u_image },
      answers: answersMap.get(q.id) ?? [],
      _count: { answers: answerCountMap.get(q.id) ?? 0 },
    }));

    res.json({
      questions: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// POST /lessons/:id/questions
router.post('/:id/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    // Enrollment check: user must be enrolled (or be admin/creator)
    const lessonRow = await queryOne<any>('SELECT moduleId FROM lessons WHERE id = ?', [id]);
    if (!lessonRow) return res.status(404).json({ error: 'Lesson not found' });
    const modRow = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lessonRow.moduleId]);
    const courseRow = modRow ? await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [modRow.courseId]) : null;
    const isCreatorOrAdmin = courseRow && (courseRow.creatorId === req.user!.id || req.user!.role === 'ADMIN');
    if (!isCreatorOrAdmin) {
      const enrollment = await queryOne<any>(
        'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
        [req.user!.id, modRow?.courseId]
      );
      if (!enrollment) return res.status(403).json({ error: 'Must be enrolled to post questions' });
    }

    const qId = genId();
    const ts = now();
    await execute(
      'INSERT INTO questions (id, content, userId, lessonId, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [qId, content, req.user!.id, id, ts]
    );

    const question = await queryOne<any>('SELECT * FROM questions WHERE id = ?', [qId]);
    const user = await queryOne<any>('SELECT id, name, image FROM users WHERE id = ?', [req.user!.id]);

    res.status(201).json({ question: { ...question, user } });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// GET /lessons/:id/resources
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const resources = await query<any[]>(
      'SELECT * FROM resources WHERE lessonId = ? ORDER BY createdAt ASC',
      [id]
    );
    res.json({ resources });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

// POST /lessons/:id/resources
router.post('/:id/resources', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Ownership check
    const lesson = await queryOne<any>('SELECT moduleId FROM lessons WHERE id = ?', [id]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const mod = await queryOne<any>('SELECT courseId FROM modules WHERE id = ?', [lesson.moduleId]);
    const course = await queryOne<any>('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
    if (!course || (course.creatorId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, type, url, fileSize } = req.body;
    if (!title || !type || !url) {
      return res.status(400).json({ error: 'title, type, and url are required' });
    }

    const resourceId = genId();
    await execute(
      'INSERT INTO resources (id, title, type, url, fileSize, lessonId) VALUES (?, ?, ?, ?, ?, ?)',
      [resourceId, title, type, url, fileSize || null, id]
    );

    const resource = await queryOne<any>('SELECT * FROM resources WHERE id = ?', [resourceId]);
    res.status(201).json({ resource });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

export default router;
