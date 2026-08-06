/** Somfy Tahoma / Connexoon local API types (Developer Mode). */

export interface TahomaSettings {
  /** Base URL van de box, bijv. https://192.168.1.128:8443 */
  baseUrl: string;
  /** Bearer-token uit Developer Mode in de Tahoma-app. */
  token: string;
  /** Automatisering aan/uit (master switch). */
  enabled: boolean;
  /** Poll-interval (sec) voor de cron-tick; standaard 60. */
  pollIntervalSec: number;
}

export const defaultTahomaSettings: TahomaSettings = {
  baseUrl: "",
  token: "",
  enabled: false,
  pollIntervalSec: 60,
};

/** Weer-metingen uit de Ecowitt/WeerLive die een regel kan gebruiken. */
export type RuleMetric =
  | "windgust_kmh"
  | "windspeed_kmh"
  | "windspd_avg10m_kmh"
  | "maxdailygust_kmh"
  | "solarradiation"
  | "uv"
  | "rainrate_mm"
  | "dailyrain_mm"
  | "temp_c"
  | "humidity"
  | "baromrel_hpa"
  | "lightning_km"
  | "lightning_num";

export type RuleOperator = ">" | "<" | ">=" | "<=";

/** Actie die op een Tahoma-apparaat wordt uitgevoerd. */
export type RuleAction =
  | "close"
  | "open"
  | "stop"
  | "setClosure"
  | "setOrientation";

export interface TahomaRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Doelapparaat (deviceURL uit /setup/devices). */
  deviceURL: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  action: RuleAction;
  /** 0–100 voor setClosure / setOrientation. */
  position?: number;
  /** Minimaal aantal minuten tussen twee triggers (anti-spam). */
  cooldownMin: number;
  lastTriggeredAt: string | null;
}

export interface TahomaState {
  name: string;
  value: number | string | boolean | null;
}

export interface TahomaCommandDef {
  commandName: string;
  nParams: number;
}

export interface TahomaDevice {
  /** Stabiele deviceURL, bijv. io://1234-5678/0. */
  deviceURL: string;
  label: string;
  /** uiClass: Awning, RollerShutter, Light, Window, … */
  uiClass: string;
  widget: string;
  controllableName: string;
  available: boolean;
  /** Genormaliseerde state-map (closure, open, …). */
  states: Record<string, number | string | boolean | null>;
  /** Beschikbare commando's op dit apparaat. */
  commands: string[];
}

export interface ActionLogTrigger {
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  value: number;
}

export interface ActionLogEntry {
  id: string;
  at: string;
  ruleId: string | null;
  ruleName: string | null;
  deviceURL: string;
  deviceName: string;
  action: RuleAction;
  position?: number;
  trigger: ActionLogTrigger | null;
  status: "ok" | "error";
  message?: string;
}

export interface TahomaStatus {
  configured: boolean;
  enabled: boolean;
  connected: boolean;
  baseUrl: string;
  deviceCount: number | null;
  error: string | null;
  lastCheckedAt: string | null;
}
