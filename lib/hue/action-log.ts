import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import type { HueActionLogEntry } from "@/lib/hue/types";

const FILE = "hue-action-log.json";
const MAX_ENTRIES = 200;

export async function getLog(): Promise<HueActionLogEntry[]> {
  const list = await readJson<HueActionLogEntry[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

export async function appendLog(entry: Omit<HueActionLogEntry, "id">): Promise<HueActionLogEntry> {
  const list = await getLog();
  const created: HueActionLogEntry = { ...entry, id: randomUUID() };
  list.unshift(created);
  await writeJson(FILE, list.slice(0, MAX_ENTRIES));
  return created;
}

export async function clearLog(): Promise<void> {
  await writeJson(FILE, []);
}
