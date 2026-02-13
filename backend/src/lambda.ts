/**
 * AWS Lambda Handler for CXFlow LMS Backend
 *
 * Database strategy:
 * - All API requests use mysql2/promise directly (no ORM)
 * - Connection pool is reused across Lambda invocations
 *
 * Lambda handler: "lambda.handler"
 */
import serverlessExpress from '@vendia/serverless-express';
import { app } from './app.js';

const serverlessHandler = serverlessExpress({ app });

export const handler = async (event: any, context: any) => {
  // Don't wait for event loop to drain
  context.callbackWaitsForEmptyEventLoop = false;
  return serverlessHandler(event, context);
};
