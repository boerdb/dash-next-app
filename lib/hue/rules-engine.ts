import "server-only";
import type { WeerLive } from "@/lib/api/types";
import { compare, metricValue } from "@/lib/tahoma/metrics";
import { setLightState } from "@/lib/hue/client";
import { appendLog } from "@/lib/hue/action-log";
import { getRules, markTriggered } from "@/lib/hue/rules-store";
import type { HueLight, HueRule, HueRuleAction, HueSettings } from "@/lib/hue/types";

export interface HueEvaluationResult {
  ruleId: string;
  ruleName: string;
  lightId: string;
  action: HueRuleAction;
  status: "ok" | "error";
  message?: string;
  triggered: boolean;
}

function cooldownPassed(rule: HueRule, now: number): boolean {
  if (!rule.lastTriggeredAt) return true;
  const last = Date.parse(rule.lastTriggeredAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= rule.cooldownMin * 60_000;
}

function briFromPercent(percent: number): number {
  return Math.max(1, Math.min(254, Math.round((percent / 100) * 254)));
}

async function executeRuleAction(
  settings: HueSettings,
  rule: HueRule,
): Promise<void> {
  const brightness = rule.brightness ?? 100;
  switch (rule.action) {
    case "on":
      await setLightState(settings, rule.lightId, {
        on: true,
        bri: briFromPercent(brightness),
      });
      break;
    case "off":
      await setLightState(settings, rule.lightId, { on: false });
      break;
    case "dim":
      await setLightState(settings, rule.lightId, {
        on: true,
        bri: briFromPercent(brightness),
      });
      break;
  }
}

export async function evaluateHueRules(
  settings: HueSettings,
  weather: WeerLive,
  lights: HueLight[],
  options: { force?: boolean } = {},
): Promise<HueEvaluationResult[]> {
  const rules = await getRules();
  const now = Date.now();
  const byId = new Map(lights.map((l) => [l.id, l]));
  const results: HueEvaluationResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!settings.enabled && !options.force) continue;

    const value = metricValue(weather, rule.metric);
    if (value == null) continue;
    if (!options.force && !cooldownPassed(rule, now)) continue;
    if (!compare(value, rule.operator, rule.threshold)) continue;

    const light = byId.get(rule.lightId);
    const lightName = light?.name ?? `Lamp ${rule.lightId}`;

    let status: "ok" | "error" = "ok";
    let message: string | undefined;
    try {
      await executeRuleAction(settings, rule);
      await markTriggered(rule.id, new Date(now).toISOString());
    } catch (e) {
      status = "error";
      message = e instanceof Error ? e.message : "Actie mislukt";
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      lightId: rule.lightId,
      action: rule.action,
      status,
      message,
      triggered: true,
    });

    await appendLog({
      at: new Date(now).toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      lightId: rule.lightId,
      lightName,
      action: rule.action,
      brightness: rule.brightness,
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
