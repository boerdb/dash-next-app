import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import type { TahomaRule } from "@/lib/tahoma/types";

const FILE = "tahoma-rules.json";

export async function getRules(): Promise<TahomaRule[]> {
  const list = await readJson<TahomaRule[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

export async function getRule(id: string): Promise<TahomaRule | null> {
  const rules = await getRules();
  return rules.find((r) => r.id === id) ?? null;
}

export async function addRule(rule: Omit<TahomaRule, "id" | "lastTriggeredAt">): Promise<TahomaRule> {
  const rules = await getRules();
  const created: TahomaRule = { ...rule, id: randomUUID(), lastTriggeredAt: null };
  rules.push(created);
  await writeJson(FILE, rules);
  return created;
}

export async function updateRule(id: string, patch: Partial<TahomaRule>): Promise<TahomaRule | null> {
  const rules = await getRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: TahomaRule = {
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

/** Markeer laatste trigger-tijdstip (gebruikt door de rules-engine). */
export async function markTriggered(id: string, at: string): Promise<void> {
  await updateRule(id, { lastTriggeredAt: at });
}
