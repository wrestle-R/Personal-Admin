import { Pool } from "pg";
const globalDb = globalThis as unknown as { adminPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return globalDb.adminPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 20000, statement_timeout: 12000 });
}
export async function query(text: string, values: unknown[] = []) { return (await db().query(text, values)).rows; }
