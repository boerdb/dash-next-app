import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import type { HueRule } from "@/lib/hue/types";

const FILE = "hue-rules.json";

export async function getRules(): Promise<HueRule[]> {
  const list = await readJson<HueRule[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

export async function getRule(id: string): Promise<HueRule | null> {
  const rules = await getRules();
  return rules.find((r) => r.id === id) ?? null;
}

export async function addRule(rule: Omit<HueRule, "id" | "lastTriggeredAt">): Promise<HueRule> {
  const rules = await getRules();
  const created: HueRule = { ...rule, id: randomUUID(), lastTriggeredAt: null };
  rules.push(created);
  await writeJson(FILE, rules);
  return created;
}

export async function updateRule(id: string, patch: Partial<HueRule>): Promise<HueRule | null> {
  const rules = await getRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: HueRule = {
    ...rules[idx],
    ...patch,
    id,
    lastTriggeredAt: patch.lastTriggeredAt ?? rules[idx].lastTriggeredAt,
  };
  rules[idx] = updated;
  await writeJson(FILE, rules);
  return updated;
}

export async function deleteRule(id: string): Promise<boolean> {
  const rules = await getRules();
  const next = rules.filter((r) => r.id !== id);
  if (next.length === rules.length) return false;
  await writeJson(FILE, next);
  return true;
}

export async function markTriggered(id: string, at: string): Promise<void> {
  await updateRule(id, { lastTriggeredAt: at });
}
