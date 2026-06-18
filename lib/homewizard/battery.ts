import {
  fetchJsonLocal,
  putJsonLocal,
} from "@/lib/homewizard/http-insecure";

export interface HomeWizardBatteryV1Raw {
  active_power_w?: number;
  state_of_charge?: number;
  state_of_charge_pct?: number;
  battery_percentage?: number;
}

export interface HomeWizardBatteryV2Measurement {
  power_w?: number;
  state_of_charge_pct?: number;
  voltage_v?: number;
  current_a?: number;
  frequency_hz?: number;
  energy_import_kwh?: number;
  energy_export_kwh?: number;
  cycles?: number;
}

export interface HomeWizardP1Batteries {
  mode?: string;
  battery_count?: number;
  power_w?: number;
  target_power_w?: number;
  max_consumption_w?: number;
  max_production_w?: number;
  permissions?: string[];
  charge_to_full?: boolean;
}

export interface BatterijLive {
  id: string;
  /** Weergavenaam (uit ENERGIE_BATTERY_LABELS of .{id}) */
  label: string;
  soc: number | null;
  vermogen_w: number;
  bereikbaar: boolean;
  melding?: string;
  voltage_v?: number | null;
  cycles?: number | null;
  import_start?: number;
  export_start?: number;
  vandaag_laden_kwh?: number;
  vandaag_ontladen_kwh?: number;
}

export interface BatterijGroep {
  mode: string;
  mode_label: string;
  /** Geconfigureerde slim-laden variant (uit ENERGIE_BATTERY_LAADSTRATEGIE). */
  laadstrategie?: BatterijLaadstrategie;
  aantal: number;
  vermogen_w: number;
  target_power_w: number | null;
  max_laden_w: number | null;
  max_ontladen_w: number | null;
  permissions: string[];
  charge_to_full: boolean;
  bereikbaar: boolean;
}

export interface BatterijHistorie {
  labels: string[];
  wattage: (number | null)[];
}

export interface BatterijFetchResult {
  batterijen: BatterijLive[];
  groep: BatterijGroep | null;
  hint: string | null;
}

export const DEFAULT_BATTERY_URLS = [
  "https://192.168.1.179",
  "https://192.168.1.170",
] as const;

const V2_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "X-Api-Version": "2",
});

export function parseBatteryUrls(value: string | undefined): string[] {
  if (value === "") return [];
  if (!value?.trim()) return [...DEFAULT_BATTERY_URLS];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseBatteryLabels(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export type BatterijLaadstrategie = "zero" | "grid_friendly" | "dynamic_hourly";

export const BATTERIJ_LAADSTRATEGIE_LABELS: Record<BatterijLaadstrategie, string> =
  {
    zero: "Nul op de meter",
    grid_friendly: "Slim en wijkvriendelijk",
    dynamic_hourly: "Slim met dynamisch tarief",
  };

export const BATTERIJ_MODI = ["zero", "predictive", "standby", "to_full"] as const;
export type BatterijMode = (typeof BATTERIJ_MODI)[number];

export const BATTERIJ_PERMISSIONS = [
  "charge_allowed",
  "discharge_allowed",
] as const;
export type BatterijPermission = (typeof BATTERIJ_PERMISSIONS)[number];

export interface BatterijControlRequest {
  mode?: BatterijMode;
  permissions?: BatterijPermission[];
  charge_to_full?: boolean;
}

export function parseLaadstrategie(
  value: string | undefined
): BatterijLaadstrategie {
  if (value === "grid_friendly" || value === "dynamic_hourly") return value;
  return "dynamic_hourly";
}

export function formatBatterijMode(
  mode: string,
  options?: {
    laadstrategie?: BatterijLaadstrategie;
    charge_to_full?: boolean;
  }
): string {
  if (options?.charge_to_full || mode === "to_full") {
    return "Eenmalig volladen";
  }
  if (mode === "predictive" && options?.laadstrategie) {
    const label = BATTERIJ_LAADSTRATEGIE_LABELS[options.laadstrategie];
    return options.laadstrategie === "dynamic_hourly"
      ? `${label} · Per uur`
      : label;
  }
  const map: Record<string, string> = {
    zero: "Nul op de meter",
    standby: "Standby",
    to_full: "Eenmalig volladen",
    predictive: "Slim laden",
  };
  return map[mode] ?? mode;
}

export function isBatterijStandby(groep: BatterijGroep): boolean {
  return (
    groep.mode === "standby" ||
    (groep.permissions.length === 0 && !groep.charge_to_full)
  );
}

export function isBatterijZeroMode(groep: BatterijGroep): boolean {
  return (
    groep.mode === "zero" &&
    groep.permissions.includes("charge_allowed") &&
    groep.permissions.includes("discharge_allowed") &&
    !groep.charge_to_full
  );
}

export function resolveLaadstrategieFromGroep(
  groep: BatterijGroep
): BatterijLaadstrategie {
  if (isBatterijZeroMode(groep)) return "zero";
  if (groep.mode === "predictive" && groep.laadstrategie) {
    return groep.laadstrategie;
  }
  return groep.laadstrategie ?? "dynamic_hourly";
}

export function formatPermissions(perms: string[]): string {
  if (perms.length === 0) return "Geen laden/ontladen";
  const parts: string[] = [];
  if (perms.includes("charge_allowed")) parts.push("laden");
  if (perms.includes("discharge_allowed")) parts.push("ontladen");
  return parts.join(" + ") || perms.join(", ");
}

export function parseBatteryTokens(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface BatteryEndpoint {
  id: string;
  label: string;
  v1Url: string | null;
  v2Url: string;
  token: string | undefined;
}

/** Laatste octet van het IP (bijv. 179 uit 192.168.1.179). */
export function batteryIdFromUrl(url: string): string {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    const parts = host.split(".");
    return parts[parts.length - 1] ?? host;
  } catch {
    return url;
  }
}

export function normalizeBatteryEndpoint(url: string): {
  v1Url: string | null;
  v2Url: string;
} {
  const withProto = url.includes("://") ? url : `https://${url}`;
  const u = new URL(withProto);
  if (u.pathname.endsWith("/api/v1/data")) {
    return {
      v1Url: u.toString(),
      v2Url: `https://${u.hostname}/api/measurement`,
    };
  }
  if (u.pathname.includes("/api/measurement")) {
    const v2Url =
      u.protocol === "https:"
        ? u.toString()
        : `https://${u.hostname}/api/measurement`;
    return { v1Url: null, v2Url };
  }
  return {
    v1Url: `http://${u.hostname}/api/v1/data`,
    v2Url: `https://${u.hostname}/api/measurement`,
  };
}

export function buildBatteryEndpoints(
  urls: string[],
  tokens: string[],
  labels: string[] = []
): BatteryEndpoint[] {
  return urls.map((url, index) => {
    const { v1Url, v2Url } = normalizeBatteryEndpoint(url);
    const id = batteryIdFromUrl(url);
    return {
      id,
      label: labels[index] ?? `.${id}`,
      v1Url,
      v2Url,
      token: tokens[index] ?? tokens[0],
    };
  });
}

export function p1BatteriesUrl(p1DataUrl: string): string {
  const u = new URL(p1DataUrl);
  return `https://${u.hostname}/api/batteries`;
}

export function parseSoc(
  raw: HomeWizardBatteryV1Raw | HomeWizardBatteryV2Measurement
): number | null {
  const candidates = [
    "state_of_charge" in raw ? raw.state_of_charge : undefined,
    raw.state_of_charge_pct,
    "battery_percentage" in raw
      ? raw.battery_percentage
      : undefined,
  ];
  for (const v of candidates) {
    if (v == null || Number.isNaN(Number(v))) continue;
    const n = Number(v);
    if (n >= 0 && n <= 100) return Math.round(n);
  }
  return null;
}

function baseBattery(
  id: string,
  label: string,
  partial: Partial<BatterijLive>
): BatterijLive {
  return {
    id,
    label,
    soc: null,
    vermogen_w: 0,
    bereikbaar: false,
    ...partial,
  };
}

export function mapBatteryV1(
  raw: HomeWizardBatteryV1Raw | null,
  id: string,
  label: string,
  melding?: string
): BatterijLive {
  if (!raw) {
    return baseBattery(id, label, { melding: melding ?? "Niet bereikbaar" });
  }
  return baseBattery(id, label, {
    soc: parseSoc(raw),
    vermogen_w: Math.round(Number(raw.active_power_w ?? 0)),
    bereikbaar: true,
  });
}

export function mapBatteryV2(
  raw: HomeWizardBatteryV2Measurement | null,
  id: string,
  label: string,
  melding?: string
): BatterijLive {
  if (!raw) {
    return baseBattery(id, label, { melding: melding ?? "Niet bereikbaar" });
  }
  const cycles = raw.cycles;
  return baseBattery(id, label, {
    soc: parseSoc(raw),
    vermogen_w: Math.round(Number(raw.power_w ?? 0)),
    bereikbaar: true,
    voltage_v:
      raw.voltage_v != null ? Math.round(Number(raw.voltage_v) * 10) / 10 : null,
    cycles: cycles != null ? Math.round(Number(cycles)) : null,
    import_start: Number(raw.energy_import_kwh ?? 0),
    export_start: Number(raw.energy_export_kwh ?? 0),
  });
}

export function mapP1BatteriesGroep(
  raw: HomeWizardP1Batteries | null,
  laadstrategie: BatterijLaadstrategie = "dynamic_hourly"
): BatterijGroep | null {
  if (!raw || raw.battery_count == null) return null;
  const mode = raw.mode ?? "onbekend";
  const perms = raw.permissions ?? [];
  const charge_to_full = Boolean(raw.charge_to_full);
  return {
    mode,
    mode_label: formatBatterijMode(mode, { laadstrategie, charge_to_full }),
    laadstrategie,
    aantal: Number(raw.battery_count),
    vermogen_w: Math.round(Number(raw.power_w ?? 0)),
    target_power_w:
      raw.target_power_w != null ? Math.round(Number(raw.target_power_w)) : null,
    max_laden_w:
      raw.max_consumption_w != null
        ? Math.round(Number(raw.max_consumption_w))
        : null,
    max_ontladen_w:
      raw.max_production_w != null
        ? Math.round(Number(raw.max_production_w))
        : null,
    permissions: perms,
    charge_to_full,
    bereikbaar: true,
  };
}

async function fetchBatteryEndpoint(ep: BatteryEndpoint): Promise<BatterijLive> {
  if (ep.token) {
    const v2 = await fetchJsonLocal<HomeWizardBatteryV2Measurement>(
      ep.v2Url,
      V2_HEADERS(ep.token)
    );
    if (v2) return mapBatteryV2(v2, ep.id, ep.label);
    return mapBatteryV2(null, ep.id, ep.label, "Token ongeldig of apparaat offline");
  }

  if (ep.v1Url) {
    const v1 = await fetchJsonLocal<HomeWizardBatteryV1Raw>(ep.v1Url);
    if (v1) return mapBatteryV1(v1, ep.id, ep.label);
  }

  return mapBatteryV2(
    null,
    ep.id,
    ep.label,
    "Token ontbreekt (ENERGIE_BATTERY_TOKENS in .env.local)"
  );
}

export async function fetchAllBatterijen(options: {
  endpoints: BatteryEndpoint[];
  p1BatteriesUrl: string | null;
  p1Token: string | undefined;
  laadstrategie?: BatterijLaadstrategie;
}): Promise<BatterijFetchResult> {
  const { endpoints, p1BatteriesUrl, p1Token, laadstrategie = "dynamic_hourly" } =
    options;

  if (endpoints.length === 0) {
    return { batterijen: [], groep: null, hint: null };
  }

  const batterijen = await Promise.all(
    endpoints.map((ep) => fetchBatteryEndpoint(ep))
  );

  let groep: BatterijGroep | null = null;
  if (p1BatteriesUrl && p1Token) {
    const raw = await fetchJsonLocal<HomeWizardP1Batteries>(
      p1BatteriesUrl,
      V2_HEADERS(p1Token)
    );
    groep = mapP1BatteriesGroep(raw, laadstrategie);
  }

  const hasOnline = batterijen.some((b) => b.bereikbaar);
  const anyToken = endpoints.some((e) => e.token);
  let hint: string | null = null;
  if (!hasOnline && !anyToken) {
    hint =
      "HomeWizard batterijen vereisen API v2-tokens. Zie .env.example (ENERGIE_BATTERY_TOKENS).";
  } else if (!hasOnline && groep) {
    hint = "Per batterij offline; totaal via P1-meter.";
  }

  return { batterijen, groep, hint };
}

export async function updateBatterijGroep(
  p1BatteriesUrl: string,
  p1Token: string,
  request: BatterijControlRequest,
  laadstrategie: BatterijLaadstrategie = "dynamic_hourly"
): Promise<
  | { ok: true; groep: BatterijGroep }
  | { ok: false; status: number; message: string }
> {
  const result = await putJsonLocal<HomeWizardP1Batteries>(
    p1BatteriesUrl,
    request,
    V2_HEADERS(p1Token)
  );

  if (!result.ok) {
    const message =
      result.status === 0
        ? result.body || "P1-meter niet bereikbaar"
        : result.status === 401 || result.status === 403
          ? "P1-token ongeldig"
          : `HomeWizard weigerde aanpassing (${result.status})`;
    return { ok: false, status: result.status || 502, message };
  }

  const groep = mapP1BatteriesGroep(result.data, laadstrategie);
  if (!groep) {
    return {
      ok: false,
      status: 502,
      message: "Onverwacht antwoord van P1-meter",
    };
  }

  return { ok: true, groep };
}

export function aggregateBatterijen(
  batterijen: BatterijLive[],
  groep: BatterijGroep | null
): {
  vermogen_totaal: number;
  soc_gemiddeld: number | null;
} {
  const online = batterijen.filter((b) => b.bereikbaar);
  let vermogen_totaal = online.reduce((s, b) => s + b.vermogen_w, 0);
  const socs = online.map((b) => b.soc).filter((s): s is number => s != null);
  let soc_gemiddeld =
    socs.length > 0
      ? Math.round(socs.reduce((a, b) => a + b, 0) / socs.length)
      : null;

  if (online.length === 0 && groep?.bereikbaar) {
    vermogen_totaal = groep.vermogen_w;
  }

  return { vermogen_totaal, soc_gemiddeld };
}
