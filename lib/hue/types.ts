/** Philips Hue Bridge local API types. */

import type { RuleMetric, RuleOperator } from "@/lib/tahoma/types";
import type { HueColorPreset, HueLightCapabilities } from "@/lib/hue/colors";

export interface HueSettings {
  /** LAN-IP van de Hue Bridge, bijv. 192.168.1.76 */
  bridgeIp: string;
  /** Application key (username) na koppelen via link-knop. */
  username: string;
  /** Weer-gedreven automatisering aan/uit. */
  enabled: boolean;
}

export const defaultHueSettings: HueSettings = {
  bridgeIp: "192.168.1.76",
  username: "",
  enabled: false,
};

export type HueRuleAction = "on" | "off" | "dim";

export interface HueRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Lamp-id uit /lights. */
  lightId: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  action: HueRuleAction;
  /** Helderheid 1–100 voor aan/dim. */
  brightness?: number;
  /** Basiskleur (alleen als lamp kleur/temperatuur ondersteunt). */
  color?: HueColorPreset;
  cooldownMin: number;
  lastTriggeredAt: string | null;
}

export interface HueActionLogTrigger {
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  value: number;
}

export interface HueActionLogEntry {
  id: string;
  at: string;
  ruleId: string | null;
  ruleName: string | null;
  lightId: string;
  lightName: string;
  action: HueRuleAction;
  brightness?: number;
  color?: HueColorPreset;
  trigger: HueActionLogTrigger | null;
  status: "ok" | "error";
  message?: string;
}

export interface HueLightState {
  on: boolean;
  /** Helderheid 1–254 (Hue-bereik). */
  bri: number | null;
  reachable: boolean;
}

export interface HueLight {
  id: string;
  name: string;
  type: string;
  modelid: string;
  manufacturername: string;
  capabilities: HueLightCapabilities;
  state: HueLightState;
}

export interface HueStatus {
  configured: boolean;
  enabled: boolean;
  connected: boolean;
  bridgeIp: string;
  bridgeName: string | null;
  lightCount: number | null;
  error: string | null;
  lastCheckedAt: string | null;
}
