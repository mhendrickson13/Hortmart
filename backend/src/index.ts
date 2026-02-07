import express from 'express';
import cors from 'cors';
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

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/e/test', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      message: 'API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      message: 'API is running',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
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

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/e`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
