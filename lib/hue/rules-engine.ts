import "server-only";
import type { WeerLive } from "@/lib/api/types";
import { compare, metricValue, METRIC_BY_KEY } from "@/lib/tahoma/metrics";
import { scheduleRuleReset } from "@/lib/hue/pending-reset";
import { snapshotFromLight } from "@/lib/hue/snapshot";
import { applyHueLightAction } from "@/lib/hue/apply-action";
import { appendLog } from "@/lib/hue/action-log";
import { getRules, markTriggered } from "@/lib/hue/rules-store";
import type { HueLight, HueRule, HueRuleAction, HueSettings } from "@/lib/hue/types";

export interface HueEvaluationResult {
  ruleId: string;
  ruleName: string;
  lightId: string;
  action: HueRuleAction;
  status: "ok" | "error" | "skipped";
  message?: string;
  triggered: boolean;
  value?: number | null;
}

function cooldownPassed(rule: HueRule, now: number): boolean {
  if (!rule.lastTriggeredAt) return true;
  const last = Date.parse(rule.lastTriggeredAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= rule.cooldownMin * 60_000;
}

function formatValue(metric: HueRule["metric"], value: number): string {
  const meta = METRIC_BY_KEY[metric];
  const unit = meta?.unit ? ` ${meta.unit}` : "";
  return `${value}${unit}`;
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
    const light = byId.get(rule.lightId);
    const lightName = light?.name ?? `Lamp ${rule.lightId}`;

    if (value == null) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        lightId: rule.lightId,
        action: rule.action,
        status: "skipped",
        message: "Geen meetwaarde (bijv. geen recente bliksem)",
        triggered: false,
        value: null,
      });
      continue;
    }

    if (!options.force && !cooldownPassed(rule, now)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        lightId: rule.lightId,
        action: rule.action,
        status: "skipped",
        message: "Cooldown actief",
        triggered: false,
        value,
      });
      continue;
    }

    if (!compare(value, rule.operator, rule.threshold)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        lightId: rule.lightId,
        action: rule.action,
        status: "skipped",
        message: `Voorwaarde niet waar (${formatValue(rule.metric, value)})`,
        triggered: false,
        value,
      });
      continue;
    }

    let status: "ok" | "error" = "ok";
    let message: string | undefined;
    const snapshot = light ? snapshotFromLight(light) : null;
    try {
      await applyHueLightAction(
        settings,
        light,
        rule.lightId,
        rule.action,
        rule.brightness,
        rule.color,
      );
      await markTriggered(rule.id, new Date(now).toISOString());

      const resetMin = rule.resetAfterMin ?? 0;
      if (resetMin > 0 && snapshot) {
        await scheduleRuleReset({
          ruleId: rule.id,
          ruleName: rule.name,
          lightId: rule.lightId,
          lightName,
          lightType: light!.type,
          snapshot,
          restoreAt: new Date(now + resetMin * 60_000).toISOString(),
        });
      }
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
      value,
    });

    await appendLog({
      at: new Date(now).toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      lightId: rule.lightId,
      lightName,
      action: rule.action,
      brightness: rule.brightness,
      color: rule.color,
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
