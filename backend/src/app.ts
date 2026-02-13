import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import coursesRoutes from './routes/courses.js';
import modulesRoutes from './routes/modules.js';
import lessonsRoutes from './routes/lessons.js';
import questionsRoutes from './routes/questions.js';
import answersRoutes from './routes/answers.js';
import notesRoutes from './routes/notes.js';
import resourcesRoutes from './routes/resources.js';
import reviewsRoutes from './routes/reviews.js';
import analyticsRoutes from './routes/analytics.js';
import uploadsRoutes from './routes/uploads.js';

// ── Lazy PrismaClient ──
// PrismaClient is created lazily so DATABASE_URL can be set via env var.
let _prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return _prisma;
}

// Proxy so route files can `import { prisma } from '../app.js'`
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getPrismaClient() as any)[prop];
  },
});

export const app = express();

// CORS - allow S3, CloudFront, and local development origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://lms.cxflow.io',
  'https://cxflowio.s3.us-east-1.amazonaws.com',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
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
app.use(express.json());

// ── Health check ──
app.get('/e/test', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      message: 'CXFlow LMS API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      message: 'CXFlow LMS API is running',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ── Database Setup Endpoint (one-time use) ──
// Uses mysql2 + IAM auth to create database and user via RDS Proxy
app.post('/e/setup', async (req, res) => {
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

    // Generate IAM auth token
    console.log('[SETUP] Generating IAM auth token...');
    const signer = new Signer({
      region: process.env.DB_REGION || 'us-east-1',
      hostname: proxyHost,
      port: dbPort,
      username: dbUser,
    });
    const token = await signer.getAuthToken();

    // Connect to MySQL via RDS Proxy with IAM auth
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

    // Create database
    console.log(`[SETUP] Creating database '${dbName}'...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    // Create regular MySQL user for Prisma (connects directly to RDS, not proxy)
    console.log(`[SETUP] Creating user '${lmsUser}'...`);
    try {
      await connection.execute(`CREATE USER IF NOT EXISTS '${lmsUser}'@'%' IDENTIFIED BY '${lmsPassword}'`);
    } catch (e: any) {
      // User might already exist
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
  } catch (error) {
    console.error('[SETUP] Error:', error);
    res.status(500).json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ── Schema Migration Endpoint (one-time use) ──
// Creates all tables using Prisma's raw SQL
app.post('/e/migrate', async (req, res) => {
  try {
    const setupKey = req.headers['x-setup-key'];
    if (setupKey !== (process.env.SETUP_KEY || 'cxflow-lms-setup-2026')) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    console.log('[MIGRATE] Creating tables...');

    // Create all tables using raw SQL (MySQL compatible)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(30) NOT NULL,
        email VARCHAR(191) NOT NULL,
        emailVerified DATETIME(3) NULL,
        password VARCHAR(191) NULL,
        name VARCHAR(191) NULL,
        image TEXT NULL,
        bio TEXT NULL,
        role VARCHAR(191) NOT NULL DEFAULT 'LEARNER',
        blockedAt DATETIME(3) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX users_email_key(email),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(30) NOT NULL,
        title VARCHAR(191) NOT NULL,
        subtitle TEXT NULL,
        description TEXT NULL,
        whatYouWillLearn TEXT NULL,
        coverImage TEXT NULL,
        price DOUBLE NOT NULL DEFAULT 0,
        currency VARCHAR(191) NOT NULL DEFAULT 'USD',
        status VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
        level VARCHAR(191) NOT NULL DEFAULT 'ALL_LEVELS',
        category VARCHAR(191) NULL,
        language VARCHAR(191) NOT NULL DEFAULT 'English',
        creatorId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        publishedAt DATETIME(3) NULL,
        INDEX courses_creatorId_idx(creatorId),
        INDEX courses_status_idx(status),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(30) NOT NULL,
        title VARCHAR(191) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        courseId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX modules_courseId_idx(courseId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS lessons (
        id VARCHAR(30) NOT NULL,
        title VARCHAR(191) NOT NULL,
        description TEXT NULL,
        videoUrl TEXT NULL,
        durationSeconds INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        isLocked BOOLEAN NOT NULL DEFAULT false,
        isFreePreview BOOLEAN NOT NULL DEFAULT false,
        moduleId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX lessons_moduleId_idx(moduleId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS resources (
        id VARCHAR(30) NOT NULL,
        title VARCHAR(191) NOT NULL,
        type VARCHAR(191) NOT NULL,
        url TEXT NOT NULL,
        fileSize INTEGER NULL,
        lessonId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX resources_lessonId_idx(lessonId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id VARCHAR(30) NOT NULL,
        userId VARCHAR(30) NOT NULL,
        courseId VARCHAR(30) NOT NULL,
        enrolledAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX enrollments_userId_courseId_key(userId, courseId),
        INDEX enrollments_userId_idx(userId),
        INDEX enrollments_courseId_idx(courseId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id VARCHAR(30) NOT NULL,
        enrollmentId VARCHAR(30) NOT NULL,
        lessonId VARCHAR(30) NOT NULL,
        progressPercent INTEGER NOT NULL DEFAULT 0,
        lastWatchedTimestamp INTEGER NOT NULL DEFAULT 0,
        lastWatchedAt DATETIME(3) NULL,
        completedAt DATETIME(3) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX lesson_progress_enrollmentId_lessonId_key(enrollmentId, lessonId),
        INDEX lesson_progress_enrollmentId_idx(enrollmentId),
        INDEX lesson_progress_lessonId_idx(lessonId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        userId VARCHAR(30) NOT NULL,
        lessonId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX questions_userId_idx(userId),
        INDEX questions_lessonId_idx(lessonId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS answers (
        id VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        userId VARCHAR(30) NOT NULL,
        questionId VARCHAR(30) NOT NULL,
        isAccepted BOOLEAN NOT NULL DEFAULT false,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX answers_userId_idx(userId),
        INDEX answers_questionId_idx(questionId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        timestampSeconds INTEGER NOT NULL DEFAULT 0,
        userId VARCHAR(30) NOT NULL,
        lessonId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX notes_userId_idx(userId),
        INDEX notes_lessonId_idx(lessonId),
        PRIMARY KEY (id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(30) NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NULL,
        userId VARCHAR(30) NOT NULL,
        courseId VARCHAR(30) NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX reviews_userId_courseId_key(userId, courseId),
        INDEX reviews_userId_idx(userId),
        INDEX reviews_courseId_idx(courseId),
        PRIMARY KEY (id)
      )
    `);

    // Add foreign keys
    const foreignKeys = [
      'ALTER TABLE courses ADD CONSTRAINT courses_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE modules ADD CONSTRAINT modules_courseId_fkey FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE lessons ADD CONSTRAINT lessons_moduleId_fkey FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE resources ADD CONSTRAINT resources_lessonId_fkey FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE enrollments ADD CONSTRAINT enrollments_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE enrollments ADD CONSTRAINT enrollments_courseId_fkey FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_enrollmentId_fkey FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_lessonId_fkey FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE questions ADD CONSTRAINT questions_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE questions ADD CONSTRAINT questions_lessonId_fkey FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE answers ADD CONSTRAINT answers_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE answers ADD CONSTRAINT answers_questionId_fkey FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE notes ADD CONSTRAINT notes_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE notes ADD CONSTRAINT notes_lessonId_fkey FOREIGN KEY (lessonId) REFERENCES lessons(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE reviews ADD CONSTRAINT reviews_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE reviews ADD CONSTRAINT reviews_courseId_fkey FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE',
    ];

    const fkResults: string[] = [];
    for (const fk of foreignKeys) {
      try {
        await prisma.$executeRawUnsafe(fk);
        fkResults.push('OK');
      } catch (e: any) {
        // Foreign key might already exist
        fkResults.push(e.message.includes('Duplicate') ? 'exists' : e.message);
      }
    }

    console.log('[MIGRATE] Tables created successfully');

    res.json({
      message: 'Migration complete - all tables created',
      tables: ['users', 'courses', 'modules', 'lessons', 'resources', 'enrollments', 'lesson_progress', 'questions', 'answers', 'notes', 'reviews'],
      foreignKeys: fkResults,
    });
  } catch (error) {
    console.error('[MIGRATE] Error:', error);
    res.status(500).json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ── Seed Admin Endpoint (one-time use) ──
app.post('/e/seed', async (req, res) => {
  try {
    const setupKey = req.headers['x-setup-key'];
    if (setupKey !== (process.env.SETUP_KEY || 'cxflow-lms-setup-2026')) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Upsert user - create or update
    const existing = await prisma.user.findUnique({ where: { email } });
    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          name: name || existing.name,
          role: role || existing.role,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
          role: role || 'LEARNER',
        },
      });
    }

    res.json({
      message: existing ? 'User updated' : 'User created',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('[SEED] Error:', error);
    res.status(500).json({
      error: 'Seed failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Routes - all prefixed with /e
app.use('/e/auth', authRoutes);
app.use('/e/users', usersRoutes);
app.use('/e/courses', coursesRoutes);
app.use('/e/modules', modulesRoutes);
app.use('/e/lessons', lessonsRoutes);
app.use('/e/questions', questionsRoutes);
app.use('/e/answers', answersRoutes);
app.use('/e/notes', notesRoutes);
app.use('/e/resources', resourcesRoutes);
app.use('/e/reviews', reviewsRoutes);
app.use('/e/analytics', analyticsRoutes);
app.use('/e/uploads', uploadsRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
