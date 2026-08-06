import "server-only";
import type { WeerLive } from "@/lib/api/types";
import type { TahomaDevice, TahomaRule, TahomaSettings } from "@/lib/tahoma/types";
import { compare, metricValue } from "@/lib/tahoma/metrics";
import { getRules, markTriggered } from "@/lib/tahoma/rules-store";
import { executeAction } from "@/lib/tahoma/client";
import { appendLog } from "@/lib/tahoma/action-log";

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  deviceURL: string;
  action: string;
  status: "ok" | "error";
  message?: string;
  triggered: boolean;
}

function cooldownPassed(rule: TahomaRule, now: number): boolean {
  if (!rule.lastTriggeredAt) return true;
  const last = Date.parse(rule.lastTriggeredAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= rule.cooldownMin * 60_000;
}

/**
 * Evalueer alle ingeschakelde regels tegen de actuele weerdata en voer
 * acties uit op de Tahoma-box. Handmatige evaluatie (force) negeert cooldown.
 */
export async function evaluateRules(
  settings: TahomaSettings,
  weather: WeerLive,
  devices: TahomaDevice[],
  options: { force?: boolean } = {},
): Promise<EvaluationResult[]> {
  const rules = await getRules();
  const now = Date.now();
  const byUrl = new Map(devices.map((d) => [d.deviceURL, d]));
  const results: EvaluationResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!settings.enabled && !options.force) continue;

    const value = metricValue(weather, rule.metric);
    if (value == null) continue;

    if (!options.force && !cooldownPassed(rule, now)) continue;
    if (!compare(value, rule.operator, rule.threshold)) continue;

    const device = byUrl.get(rule.deviceURL);
    const deviceName = device?.label ?? rule.deviceURL;

    let status: "ok" | "error" = "ok";
    let message: string | undefined;
    try {
      await executeAction(settings, rule.deviceURL, rule.action, rule.position);
      await markTriggered(rule.id, new Date(now).toISOString());
    } catch (e) {
      status = "error";
      message = e instanceof Error ? e.message : "Actie mislukt";
    }

    const result: EvaluationResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      deviceURL: rule.deviceURL,
      action: rule.action,
      status,
      message,
      triggered: true,
    };
    results.push(result);

    await appendLog({
      at: new Date(now).toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      deviceURL: rule.deviceURL,
      deviceName,
      action: rule.action,
      position: rule.position,
      trigger: {
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        value,
      },
      status,
      message,
    });
  }

  return results;
}
