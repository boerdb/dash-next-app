import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import type { ActionLogEntry } from "@/lib/tahoma/types";

const FILE = "tahoma-action-log.json";
const MAX_ENTRIES = 200;

export async function getLog(): Promise<ActionLogEntry[]> {
  const list = await readJson<ActionLogEntry[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

export async function appendLog(entry: Omit<ActionLogEntry, "id">): Promise<ActionLogEntry> {
  const list = await getLog();
  const created: ActionLogEntry = { ...entry, id: randomUUID() };
  list.unshift(created);
  const trimmed = list.slice(0, MAX_ENTRIES);
  await writeJson(FILE, trimmed);
  return created;
}

export async function clearLog(): Promise<void> {
  await writeJson(FILE, []);
}
