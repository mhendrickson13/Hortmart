"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const email_js_1 = require("../email.js");
const activity_js_1 = require("../activity.js");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d');
// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Valid email and password (min 6 chars) are required' });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const id = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('INSERT INTO users (id, email, password, name, role, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [id, email, hashedPassword, name || null, 'LEARNER', ts]);
        const user = { id, email, name: name || null, role: 'LEARNER', createdAt: new Date() };
        const token = jsonwebtoken_1.default.sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // Send welcome email (fire-and-forget)
        (0, email_js_1.sendWelcome)(email, name || undefined).catch(() => { });
        (0, activity_js_1.logActivity)({ event: 'user.registered', userId: id, userName: name || email, meta: { email } });
        res.status(201).json({ user, token });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT * FROM users WHERE email = ?', [email]);
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.blockedAt) {
            return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        (0, activity_js_1.logActivity)({ event: 'user.login', userId: user.id, userName: user.name || user.email, meta: { email: user.email } });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// GET /auth/session
router.get('/session', auth_js_1.authenticate, async (req, res) => {
    try {
        const user = await (0, db_js_1.queryOne)('SELECT id, email, name, image, bio, role FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Session error:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});
// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required' });
        const user = await (0, db_js_1.queryOne)('SELECT id, name, email FROM users WHERE email = ?', [email]);
        // Always return success to prevent email enumeration
        if (!user)
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        // Generate a secure reset token (48 hex chars)
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Store in DB — upsert by overwriting any existing token for this user
        const existing = await (0, db_js_1.queryOne)('SELECT id FROM password_resets WHERE userId = ?', [user.id]);
        if (existing) {
            await (0, db_js_1.execute)('UPDATE password_resets SET token = ?, expiresAt = ?, usedAt = NULL, updatedAt = ? WHERE id = ?', [resetToken, expiresAt.toISOString().slice(0, 23).replace('T', ' '), (0, db_js_1.now)(), existing.id]);
        }
        else {
            await (0, db_js_1.execute)('INSERT INTO password_resets (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)', [(0, db_js_1.genId)(), user.id, resetToken, expiresAt.toISOString().slice(0, 23).replace('T', ' ')]);
        }
        // Send the email
        await (0, email_js_1.sendPasswordReset)(user.email, user.name, resetToken);
        res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password || password.length < 6) {
            return res.status(400).json({ error: 'Valid token and password (min 6 chars) are required' });
        }
        const reset = await (0, db_js_1.queryOne)('SELECT * FROM password_resets WHERE token = ? AND usedAt IS NULL', [token]);
        if (!reset)
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        // Check expiration
        const expiresAt = new Date(reset.expiresAt).getTime();
        if (Date.now() > expiresAt) {
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }
        // Hash the new password and update the user
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await (0, db_js_1.execute)('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [hashedPassword, (0, db_js_1.now)(), reset.userId]);
        // Mark token as used
        await (0, db_js_1.execute)('UPDATE password_resets SET usedAt = ? WHERE id = ?', [(0, db_js_1.now)(), reset.id]);
        res.json({ message: 'Password has been reset successfully. You can now sign in.' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map