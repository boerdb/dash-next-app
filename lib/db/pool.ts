import "server-only";
import mysql from "mysql2/promise";
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
  }
  return pool;
}

export function isDirectDbEnabled(): boolean {
  return Boolean(env.DATABASE_URL);
}
