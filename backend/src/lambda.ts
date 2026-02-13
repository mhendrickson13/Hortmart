/**
 * AWS Lambda Handler for CXFlow LMS Backend
 *
 * Database strategy:
 * - Normal API requests: Prisma connects to RDS directly with a standard MySQL user
 * - Setup endpoint: Uses mysql2 + IAM auth to create database and user on RDS Proxy
 *
 * Lambda handler: "dist/lambda.handler"
 */
import serverlessExpress from '@vendia/serverless-express';
import { app } from './app.js';

const serverlessHandler = serverlessExpress({ app });

export const handler = async (event: any, context: any) => {
  // Don't wait for event loop to drain
  context.callbackWaitsForEmptyEventLoop = false;
  return serverlessHandler(event, context);
};
