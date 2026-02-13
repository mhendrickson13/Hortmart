/**
 * Lightweight MySQL database helper using mysql2/promise.
 * Replaces Prisma ORM to keep Lambda package under 5MB.
 */
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
/** Execute a query and return rows (uses text protocol — handles LIMIT ? correctly) */
export declare function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T>;
/** Execute INSERT/UPDATE/DELETE and return result metadata */
export declare function execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
/** Get raw pool for transactions */
export declare function pool(): Pool;
/** Get a single row or null */
export declare function queryOne<T = RowDataPacket>(sql: string, params?: any[]): Promise<T | null>;
/** Count rows matching a query */
export declare function count(sql: string, params?: any[]): Promise<number>;
export declare function genId(): string;
/** Current timestamp formatted for MySQL DATETIME(3) */
export declare function now(): string;
/** Generate (?, ?, ...) for IN clauses */
export declare function inPlaceholders(arr: any[]): string;
//# sourceMappingURL=db.d.ts.map