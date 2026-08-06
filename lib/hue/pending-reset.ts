import "server-only";
import { randomUUID } from "node:crypto";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import { appendLog } from "@/lib/hue/action-log";
import { restoreLightSnapshot } from "@/lib/hue/client";
import type { HueLightStateSnapshot } from "@/lib/hue/snapshot";
import { describeSnapshot } from "@/lib/hue/snapshot";
import type { HueSettings } from "@/lib/hue/types";

const FILE = "hue-pending-resets.json";

export interface HuePendingReset {
  id: string;
  ruleId: string;
  ruleName: string;
  lightId: string;
  lightName: string;
  lightType: string;
  restoreAt: string;
  snapshot: HueLightStateSnapshot;
}

export interface HueRestoreResult {
  ruleId: string;
  ruleName: string;
  lightId: string;
  lightName: string;
  status: "ok" | "error";
  message?: string;
}

async function readAll(): Promise<HuePendingReset[]> {
  const list = await readJson<HuePendingReset[]>(FILE, []);
  return Array.isArray(list) ? list : [];
}

async function writeAll(list: HuePendingReset[]): Promise<void> {
  await writeJson(FILE, list);
}

/** Plan herstel na trigger; behoud oorspronkelijke snapshot bij herhaalde triggers. */
export async function scheduleRuleReset(opts: {
  ruleId: string;
  ruleName: string;
  lightId: string;
  lightName: string;
  lightType: string;
  snapshot: HueLightStateSnapshot;
  restoreAt: string;
}): Promise<void> {
  const list = await readAll();
  const idx = list.findIndex((r) => r.ruleId === opts.ruleId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      restoreAt: opts.restoreAt,
      lightName: opts.lightName,
      lightType: opts.lightType,
    };
  } else {
    list.push({
      id: randomUUID(),
      ruleId: opts.ruleId,
      ruleName: opts.ruleName,
      lightId: opts.lightId,
      lightName: opts.lightName,
      lightType: opts.lightType,
      restoreAt: opts.restoreAt,
      snapshot: opts.snapshot,
    });
  }
  await writeAll(list);
}

export async function processPendingResets(
  settings: HueSettings,
  now = Date.now(),
): Promise<HueRestoreResult[]> {
  const list = await readAll();
  if (list.length === 0) return [];

  const due = list.filter((r) => Date.parse(r.restoreAt) <= now);
  const remaining = list.filter((r) => Date.parse(r.restoreAt) > now);
  const results: HueRestoreResult[] = [];

  for (const entry of due) {
    let status: "ok" | "error" = "ok";
    let message: string | undefined;
    try {
      await restoreLightSnapshot(settings, entry.lightId, entry.snapshot, entry.lightType);
      message = describeSnapshot(entry.snapshot);
    } catch (e) {
      status = "error";
      message = e instanceof Error ? e.message : "Herstel mislukt";
    }

    results.push({
      ruleId: entry.ruleId,
      ruleName: entry.ruleName,
      lightId: entry.lightId,
      lightName: entry.lightName,
      status,
      message,
    });

    await appendLog({
      at: new Date(now).toISOString(),
      ruleId: entry.ruleId,
      ruleName: entry.ruleName,
      lightId: entry.lightId,
      lightName: entry.lightName,
      action: entry.snapshot.on ? "on" : "off",
      brightness:
        entry.snapshot.on && entry.snapshot.bri != null
          ? Math.round((entry.snapshot.bri / 254) * 100)
          : undefined,
      trigger: null,
      status,
      message: status === "ok" ? `Hersteld: ${message}` : message,
    });
  }

  await writeAll(remaining);
  return results;
}
