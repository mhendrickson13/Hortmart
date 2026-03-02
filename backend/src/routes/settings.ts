/**
 * Admin-only settings routes (webhook URL, etc.)
 */
import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute, genId, now } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Only admin/creator can manage settings
function requireAdmin(req: AuthRequest, res: Response, next: Function) {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'CREATOR') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /settings - return all settings (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query<any[]>('SELECT `key`, value, updatedAt FROM app_settings');
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PATCH /settings - upsert settings (admin only)
router.patch('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const entries = Object.entries(req.body) as [string, string][];
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const ts = now();
    for (const [key, value] of entries) {
      // Validate known keys
      if (!['webhookUrl', 'platformLanguage'].includes(key)) continue;

      const existing = await queryOne<any>('SELECT id FROM app_settings WHERE `key` = ?', [key]);
      if (existing) {
        await execute(
          'UPDATE app_settings SET value = ?, updatedAt = ? WHERE `key` = ?',
          [value || '', ts, key],
        );
      } else {
        await execute(
          'INSERT INTO app_settings (id, `key`, value, updatedAt) VALUES (?, ?, ?, ?)',
          [genId(), key, value || '', ts],
        );
      }
    }

    // Return updated settings
    const rows = await query<any[]>('SELECT `key`, value FROM app_settings');
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;

    res.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /settings/test-webhook - fire a test event to the webhook
router.post('/test-webhook', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const row = await queryOne<any>(`SELECT value FROM app_settings WHERE \`key\` = 'webhookUrl'`);
    const url = row?.value;
    if (!url) {
      return res.status(400).json({ error: 'No webhook URL configured' });
    }

    const testPayload = {
      id: 'test_' + Date.now(),
      event: 'test.ping',
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      meta: { message: 'This is a test webhook from CXFlow LMS' },
      createdAt: now(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || 'Failed to reach webhook URL',
    });
  }
});

// POST /settings/generate-api-token - generate or regenerate API token for current user
router.post('/generate-api-token', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const ts = now();
    await execute(
      'UPDATE users SET apiToken = ?, updatedAt = ? WHERE id = ?',
      [token, ts, req.user!.id],
    );
    res.json({ apiToken: token });
  } catch (error) {
    console.error('Generate API token error:', error);
    res.status(500).json({ error: 'Failed to generate API token' });
  }
});

// GET /settings/api-token - get current API token for current user
router.get('/api-token', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<any>('SELECT apiToken FROM users WHERE id = ?', [req.user!.id]);
    res.json({ apiToken: user?.apiToken || null });
  } catch (error) {
    console.error('Get API token error:', error);
    res.status(500).json({ error: 'Failed to get API token' });
  }
});

// DELETE /settings/api-token - revoke API token
router.delete('/api-token', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const ts = now();
    await execute(
      'UPDATE users SET apiToken = NULL, updatedAt = ? WHERE id = ?',
      [ts, req.user!.id],
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke API token error:', error);
    res.status(500).json({ error: 'Failed to revoke API token' });
  }
});

// POST /settings/regenerate-og — Regenerate OG pages for all published courses
router.post('/regenerate-og', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { upsertCourseOgPage } = await import('../og.js');
    const courses = await query<any[]>(
      'SELECT id, title, subtitle, description, coverImage FROM courses WHERE status = ?',
      ['PUBLISHED']
    );
    let ok = 0;
    for (const c of courses) {
      try { await upsertCourseOgPage(c); ok++; } catch { /* skip */ }
    }
    res.json({ total: courses.length, generated: ok });
  } catch (error) {
    console.error('Regenerate OG error:', error);
    res.status(500).json({ error: 'Failed to regenerate OG pages' });
  }
});

export default router;
