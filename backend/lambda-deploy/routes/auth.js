"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
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
exports.default = router;
//# sourceMappingURL=auth.js.map