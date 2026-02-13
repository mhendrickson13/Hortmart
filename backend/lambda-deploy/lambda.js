"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * AWS Lambda Handler for CXFlow LMS Backend
 *
 * Database strategy:
 * - Normal API requests: Prisma connects to RDS directly with a standard MySQL user
 * - Setup endpoint: Uses mysql2 + IAM auth to create database and user on RDS Proxy
 *
 * Lambda handler: "dist/lambda.handler"
 */
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
const app_js_1 = require("./app.js");
const serverlessHandler = (0, serverless_express_1.default)({ app: app_js_1.app });
const handler = async (event, context) => {
    // Don't wait for event loop to drain
    context.callbackWaitsForEmptyEventLoop = false;
    return serverlessHandler(event, context);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map