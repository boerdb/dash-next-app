import "server-only";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2";
import { env } from "@/lib/env.server";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is niet geconfigureerd");
  }
  if (!pool) {
    pool = mysql.createPool({
      uri: env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 5,
      enableKeepAlive: true,
    });
    // meet_moment in DB = lokale tijd (NL); Node op UTC anders 5-min insert geblokkeerd
    (pool as unknown as { pool: { on: (e: string, cb: (c: Connection) => void) => void } }).pool.on(
      "connection",
      (conn) => {
        void conn.query("SET time_zone = 'Europe/Amsterdam'");
      }
    );
  }
  return pool;
}

export function isDirectDbEnabled(): boolean {
  return Boolean(env.DATABASE_URL);
}
