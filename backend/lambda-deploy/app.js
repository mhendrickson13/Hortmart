"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("./db.js");
// Import routes
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const courses_js_1 = __importDefault(require("./routes/courses.js"));
const modules_js_1 = __importDefault(require("./routes/modules.js"));
const lessons_js_1 = __importDefault(require("./routes/lessons.js"));
const questions_js_1 = __importDefault(require("./routes/questions.js"));
const answers_js_1 = __importDefault(require("./routes/answers.js"));
const notes_js_1 = __importDefault(require("./routes/notes.js"));
const resources_js_1 = __importDefault(require("./routes/resources.js"));
const reviews_js_1 = __importDefault(require("./routes/reviews.js"));
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
const uploads_js_1 = __importDefault(require("./routes/uploads.js"));
const notifications_js_1 = __importDefault(require("./routes/notifications.js"));
const favourites_js_1 = __importDefault(require("./routes/favourites.js"));
const video_js_1 = __importDefault(require("./routes/video.js"));
exports.app = (0, express_1.default)();
// CORS - allow S3, CloudFront, and local development origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lms.cxflow.io',
    'https://cxflowio.s3.us-east-1.amazonaws.com',
    process.env.FRONTEND_URL,
].filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
        }
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
exports.app.use(express_1.default.json({ limit: '1mb' }));
// ── Health check ──
exports.app.get('/e/test', async (req, res) => {
    try {
        await (0, db_js_1.query)('SELECT 1');
        res.json({
            message: 'CXFlow LMS API is running',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'CXFlow LMS API is running',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ── Database Setup Endpoint (one-time use) ──
exports.app.post('/e/setup', async (req, res) => {
    try {
        const setupKey = req.headers['x-setup-key'];
        if (setupKey !== (process.env.SETUP_KEY || 'cxflow-lms-setup-2026')) {
            return res.status(403).json({ error: 'Invalid setup key' });
        }
        const { Signer } = await import('@aws-sdk/rds-signer');
        const mysql2 = await import('mysql2/promise');
        const proxyHost = process.env.DB_PROXY_HOST || 'cxflowrdsproxy.proxy-ch4lud8dyidz.us-east-1.rds.amazonaws.com';
        const dbUser = process.env.DB_ADMIN_USER || 'admin';
        const dbPort = parseInt(process.env.DB_PORT || '3306');
        const dbName = process.env.DB_NAME || 'cxflow_lms';
        const lmsUser = process.env.DB_LMS_USER || 'lms_service';
        const lmsPassword = process.env.DB_LMS_PASSWORD || 'CxFlowLms2026!Secure';
        const rdsHost = process.env.DB_HOST || 'cxflowserverdb.ch4lud8dyidz.us-east-1.rds.amazonaws.com';
        console.log('[SETUP] Generating IAM auth token...');
        const signer = new Signer({
            region: process.env.DB_REGION || 'us-east-1',
            hostname: proxyHost,
            port: dbPort,
            username: dbUser,
        });
        const token = await signer.getAuthToken();
        console.log('[SETUP] Connecting to MySQL via RDS Proxy...');
        const connection = await mysql2.default.createConnection({
            host: proxyHost,
            user: dbUser,
            password: token,
            port: dbPort,
            ssl: { rejectUnauthorized: true },
            authPlugins: {
                mysql_clear_password: () => () => Buffer.from(token + '\0'),
            },
        });
        console.log(`[SETUP] Creating database '${dbName}'...`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`[SETUP] Creating user '${lmsUser}'...`);
        try {
            await connection.execute(`CREATE USER IF NOT EXISTS '${lmsUser}'@'%' IDENTIFIED BY '${lmsPassword}'`);
        }
        catch (e) {
            if (!e.message.includes('already exists')) {
                console.log(`[SETUP] User creation note: ${e.message}`);
            }
        }
        await connection.execute(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${lmsUser}'@'%'`);
        await connection.execute('FLUSH PRIVILEGES');
        await connection.end();
        console.log('[SETUP] Database and user created successfully');
        res.json({
            message: 'Setup complete',
            database: dbName,
            user: lmsUser,
            rdsHost: rdsHost,
            prismaUrl: `mysql://${lmsUser}:PASSWORD@${rdsHost}:${dbPort}/${dbName}`,
            note: 'Set DATABASE_URL in Lambda env vars, then call POST /e/migrate to create tables',
        });
    }
    catch (error) {
        console.error('[SETUP] Error:', error);
        res.status(500).json({
            error: 'Setup failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ── Schema Migration Endpoint (one-time use) ──
exports.app.post('/e/migrate', async (req, res) => {
    try {
        const setupKey = req.headers['x-setup-key'];
        if (setupKey !== (process.env.SETUP_KEY || 'cxflow-lms-setup-2026')) {
            return res.status(403).json({ error: 'Invalid setup key' });
        }
        console.log('[MIGRATE] Creating tables...');
        const tableStatements = [
            `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(30) NOT NULL, email VARCHAR(191) NOT NULL, emailVerified DATETIME(3) NULL,
        password VARCHAR(191) NULL, name VARCHAR(191) NULL, image TEXT NULL, bio TEXT NULL,
        role VARCHAR(191) NOT NULL DEFAULT 'LEARNER', blockedAt DATETIME(3) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX users_email_key(email), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(30) NOT NULL, title VARCHAR(191) NOT NULL, subtitle TEXT NULL, description TEXT NULL,
        whatYouWillLearn TEXT NULL, coverImage TEXT NULL, price DOUBLE NOT NULL DEFAULT 0,
        currency VARCHAR(191) NOT NULL DEFAULT 'USD', status VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
        level VARCHAR(191) NOT NULL DEFAULT 'ALL_LEVELS', category VARCHAR(191) NULL,
        language VARCHAR(191) NOT NULL DEFAULT 'English', creatorId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        publishedAt DATETIME(3) NULL, INDEX courses_creatorId_idx(creatorId),
        INDEX courses_status_idx(status), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(30) NOT NULL, title VARCHAR(191) NOT NULL, position INTEGER NOT NULL DEFAULT 0,
        courseId VARCHAR(30) NOT NULL, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL, INDEX modules_courseId_idx(courseId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS lessons (
        id VARCHAR(30) NOT NULL, title VARCHAR(191) NOT NULL, description TEXT NULL, videoUrl TEXT NULL,
        durationSeconds INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
        isLocked BOOLEAN NOT NULL DEFAULT false, isFreePreview BOOLEAN NOT NULL DEFAULT false,
        moduleId VARCHAR(30) NOT NULL, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL, INDEX lessons_moduleId_idx(moduleId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS resources (
        id VARCHAR(30) NOT NULL, title VARCHAR(191) NOT NULL, type VARCHAR(191) NOT NULL,
        url TEXT NOT NULL, fileSize INTEGER NULL, lessonId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX resources_lessonId_idx(lessonId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS enrollments (
        id VARCHAR(30) NOT NULL, userId VARCHAR(30) NOT NULL, courseId VARCHAR(30) NOT NULL,
        enrolledAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX enrollments_userId_courseId_key(userId, courseId),
        INDEX enrollments_userId_idx(userId), INDEX enrollments_courseId_idx(courseId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS lesson_progress (
        id VARCHAR(30) NOT NULL, enrollmentId VARCHAR(30) NOT NULL, lessonId VARCHAR(30) NOT NULL,
        progressPercent INTEGER NOT NULL DEFAULT 0, lastWatchedTimestamp INTEGER NOT NULL DEFAULT 0,
        lastWatchedAt DATETIME(3) NULL, completedAt DATETIME(3) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX lesson_progress_enrollmentId_lessonId_key(enrollmentId, lessonId),
        INDEX lesson_progress_enrollmentId_idx(enrollmentId),
        INDEX lesson_progress_lessonId_idx(lessonId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(30) NOT NULL, content TEXT NOT NULL, userId VARCHAR(30) NOT NULL,
        lessonId VARCHAR(30) NOT NULL, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL, INDEX questions_userId_idx(userId),
        INDEX questions_lessonId_idx(lessonId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS answers (
        id VARCHAR(30) NOT NULL, content TEXT NOT NULL, userId VARCHAR(30) NOT NULL,
        questionId VARCHAR(30) NOT NULL, isAccepted BOOLEAN NOT NULL DEFAULT false,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        INDEX answers_userId_idx(userId), INDEX answers_questionId_idx(questionId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(30) NOT NULL, content TEXT NOT NULL, timestampSeconds INTEGER NOT NULL DEFAULT 0,
        userId VARCHAR(30) NOT NULL, lessonId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        INDEX notes_userId_idx(userId), INDEX notes_lessonId_idx(lessonId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(30) NOT NULL, rating INTEGER NOT NULL, comment TEXT NULL,
        userId VARCHAR(30) NOT NULL, courseId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX reviews_userId_courseId_key(userId, courseId),
        INDEX reviews_userId_idx(userId), INDEX reviews_courseId_idx(courseId), PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(30) NOT NULL, userId VARCHAR(30) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        title VARCHAR(500) NOT NULL, description TEXT NULL,
        link VARCHAR(500) NULL, isRead BOOLEAN NOT NULL DEFAULT false,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX notifications_userId_idx(userId),
        INDEX notifications_userId_read_idx(userId, isRead),
        PRIMARY KEY (id))`,
            `CREATE TABLE IF NOT EXISTS user_course_saves (
        id VARCHAR(30) NOT NULL, userId VARCHAR(30) NOT NULL,
        courseId VARCHAR(30) NOT NULL,
        type VARCHAR(20) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX ucs_user_course_type(userId, courseId, type),
        INDEX ucs_userId_idx(userId), INDEX ucs_courseId_idx(courseId),
        PRIMARY KEY (id))`,
        ];
        for (const sql of tableStatements) {
            await (0, db_js_1.execute)(sql);
        }
        // ── Add video encoding columns (idempotent ALTER TABLE) ──
        const alterStatements = [
            `ALTER TABLE lessons ADD COLUMN videoStatus VARCHAR(20) NULL DEFAULT NULL`,
            `ALTER TABLE lessons ADD COLUMN encodingJobId VARCHAR(191) NULL DEFAULT NULL`,
            `ALTER TABLE lessons ADD COLUMN hlsUrl TEXT NULL DEFAULT NULL`,
        ];
        for (const sql of alterStatements) {
            try {
                await (0, db_js_1.execute)(sql);
            }
            catch (e) {
                // Ignore "Duplicate column name" error (errno 1060) — column already exists
                if (e?.errno !== 1060 && !(e?.message || '').includes('Duplicate column'))
                    throw e;
            }
        }
        console.log('[MIGRATE] Tables created successfully');
        res.json({
            message: 'Migration complete - all tables created',
            tables: ['users', 'courses', 'modules', 'lessons', 'resources', 'enrollments', 'lesson_progress', 'questions', 'answers', 'notes', 'reviews', 'notifications', 'user_course_saves'],
        });
    }
    catch (error) {
        console.error('[MIGRATE] Error:', error);
        res.status(500).json({
            error: 'Migration failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ── Seed Admin Endpoint (one-time use) ──
exports.app.post('/e/seed', async (req, res) => {
    try {
        const setupKey = req.headers['x-setup-key'];
        if (setupKey !== (process.env.SETUP_KEY || 'cxflow-lms-setup-2026')) {
            return res.status(403).json({ error: 'Invalid setup key' });
        }
        const { email, password, name, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const ts = (0, db_js_1.now)();
        const existing = await (0, db_js_1.queryOne)('SELECT id, name, role FROM users WHERE email = ?', [email]);
        if (existing) {
            await (0, db_js_1.execute)('UPDATE users SET password = ?, name = ?, role = ?, updatedAt = ? WHERE email = ?', [hashedPassword, name || existing.name, role || existing.role, ts, email]);
            res.json({
                message: 'User updated',
                user: { id: existing.id, email, name: name || existing.name, role: role || existing.role },
            });
        }
        else {
            const id = (0, db_js_1.genId)();
            await (0, db_js_1.execute)('INSERT INTO users (id, email, password, name, role, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [id, email, hashedPassword, name || null, role || 'LEARNER', ts]);
            res.json({
                message: 'User created',
                user: { id, email, name: name || null, role: role || 'LEARNER' },
            });
        }
    }
    catch (error) {
        console.error('[SEED] Error:', error);
        res.status(500).json({
            error: 'Seed failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Routes - all prefixed with /e
exports.app.use('/e/auth', auth_js_1.default);
exports.app.use('/e/users', users_js_1.default);
exports.app.use('/e/courses', courses_js_1.default);
exports.app.use('/e/modules', modules_js_1.default);
exports.app.use('/e/lessons', lessons_js_1.default);
exports.app.use('/e/questions', questions_js_1.default);
exports.app.use('/e/answers', answers_js_1.default);
exports.app.use('/e/notes', notes_js_1.default);
exports.app.use('/e/resources', resources_js_1.default);
exports.app.use('/e/reviews', reviews_js_1.default);
exports.app.use('/e/analytics', analytics_js_1.default);
exports.app.use('/e/uploads', uploads_js_1.default);
exports.app.use('/e/notifications', notifications_js_1.default);
exports.app.use('/e/favourites', favourites_js_1.default);
exports.app.use('/e/video', video_js_1.default);
// Error handling
exports.app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
exports.app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
//# sourceMappingURL=app.js.map