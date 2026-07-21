import type { H3Event } from "h3";
import type { D1Database } from "@cloudflare/workers-types";

let _db: D1Database | null = null;

export const getDb = (event: H3Event): D1Database | null => {
  const db = (event.context.cloudflare as { env: { DB: D1Database } } | undefined)?.env?.DB ?? null;
  if (db) {
    _db = db;
  }
  return _db;
};
