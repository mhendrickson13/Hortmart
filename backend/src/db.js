"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.execute = execute;
exports.pool = pool;
exports.queryOne = queryOne;
exports.count = count;
exports.genId = genId;
exports.now = now;
exports.inPlaceholders = inPlaceholders;
/**
 * Lightweight MySQL database helper using mysql2/promise.
 * Replaces Prisma ORM to keep Lambda package under 5MB.
 */
const promise_1 = __importDefault(require("mysql2/promise"));
const crypto_1 = __importDefault(require("crypto"));
// ── Connection Pool (reused across Lambda invocations) ──
let _pool = null;
function getPool() {
    if (!_pool) {
        const url = process.env.DATABASE_URL;
        if (!url)
            throw new Error('DATABASE_URL environment variable is required');
        _pool = promise_1.default.createPool({
            uri: url,
            waitForConnections: true,
            connectionLimit: 5,
            idleTimeout: 60000,
            enableKeepAlive: true,
        });
    }
    return _pool;
}
/** Execute a query and return rows (uses text protocol — handles LIMIT ? correctly) */
async function query(sql, params) {
    const [rows] = await getPool().query(sql, params);
    return rows;
}
/** Execute INSERT/UPDATE/DELETE and return result metadata */
async function execute(sql, params) {
    const [result] = await getPool().query(sql, params);
    return result;
}
/** Get raw pool for transactions */
function pool() {
    return getPool();
}
/** Get a single row or null */
async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return rows[0] || null;
}
/** Count rows matching a query */
async function count(sql, params) {
    const rows = await query(sql, params);
    return Number(rows[0]?.cnt ?? 0);
}
// ── ID Generation (replaces Prisma's cuid()) ──
function genId() {
    // 25-char ID compatible with existing VARCHAR(30) columns
    // Format: timestamp(8 base36) + random(17 hex) = 25 chars
    const ts = Date.now().toString(36).padStart(8, '0');
    const rand = crypto_1.default.randomBytes(9).toString('hex').slice(0, 17);
    return ts + rand;
}
// ── Date Helper ──
/** Current timestamp formatted for MySQL DATETIME(3) */
function now() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
}
// ── Placeholder helpers ──
/** Generate (?, ?, ...) for IN clauses */
function inPlaceholders(arr) {
    return arr.map(() => '?').join(', ');
}
//# sourceMappingURL=db.js.map