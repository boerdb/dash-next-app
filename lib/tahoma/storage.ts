import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Lees een JSON-bestand; geeft fallback terug als het bestand ontbreekt/corrupt is. */
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const full = path.join(DATA_DIR, file);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Atomaire schrijfactie (write-then-rename) om corrupte halve schrijfsels te voorkomen. */
export async function writeJson<T>(file: string, value: T): Promise<void> {
  await ensureDir();
  const full = path.join(DATA_DIR, file);
  const tmp = `${full}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, full);
}
