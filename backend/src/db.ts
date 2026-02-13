/**
 * Lightweight MySQL database helper using mysql2/promise.
 * Replaces Prisma ORM to keep Lambda package under 5MB.
 */
import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import crypto from 'crypto';

// ── Connection Pool (reused across Lambda invocations) ──
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is required');
    _pool = mysql.createPool({
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
export async function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}

/** Execute INSERT/UPDATE/DELETE and return result metadata */
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await getPool().query(sql, params);
  return result as ResultSetHeader;
}

/** Get raw pool for transactions */
export function pool(): Pool {
  return getPool();
}

/** Get a single row or null */
export async function queryOne<T = RowDataPacket>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<RowDataPacket[]>(sql, params);
  return (rows[0] as T) || null;
}

/** Count rows matching a query */
export async function count(sql: string, params?: any[]): Promise<number> {
  const rows = await query<RowDataPacket[]>(sql, params);
  return Number(rows[0]?.cnt ?? 0);
}

// ── ID Generation (replaces Prisma's cuid()) ──

export function genId(): string {
  // 25-char ID compatible with existing VARCHAR(30) columns
  // Format: timestamp(8 base36) + random(17 hex) = 25 chars
  const ts = Date.now().toString(36).padStart(8, '0');
  const rand = crypto.randomBytes(9).toString('hex').slice(0, 17);
  return ts + rand;
}

// ── Date Helper ──

/** Current timestamp formatted for MySQL DATETIME(3) */
export function now(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

// ── Placeholder helpers ──

/** Generate (?, ?, ...) for IN clauses */
export function inPlaceholders(arr: any[]): string {
  return arr.map(() => '?').join(', ');
}
