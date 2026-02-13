/**
 * Local Development Server
 * 
 * This file is the entry point for local development.
 * For Lambda deployment, use lambda.ts instead.
 */
import { app, prisma } from './app.js';

const PORT = process.env.PORT || 3001;

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
