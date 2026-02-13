"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Local Development Server
 *
 * This file is the entry point for local development.
 * For Lambda deployment, use lambda.ts instead.
 */
const app_js_1 = require("./app.js");
const PORT = process.env.PORT || 3001;
// Start server
app_js_1.app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/e`);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await app_js_1.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map