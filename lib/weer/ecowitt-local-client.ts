import type { WeerLive } from "@/lib/api/types";
import { parseLightningTime } from "@/lib/weer/lightning-time";

interface GatewayItem {
  id?: string;
  val?: string;
  unit?: string;
  battery?: string;
}

interface GatewayWh25 {
  intemp?: string;
  unit?: string;
  inhumi?: string;
  abs?: string;
  rel?: string;
  battery?: string;
}

interface GatewayChannel {
  channel?: string;
  name?: string;
  battery?: string;
  temp?: string;
  unit?: string;
  humidity?: string;
}

interface GatewayLightningBlock {
  distance?: string;
  date?: string;
  timestamp?: string;
  count?: string;
  battery?: string;
}

export interface GatewayLiveResponse {
  common_list?: GatewayItem[];
  piezoRain?: GatewayItem[];
  rain?: GatewayItem[];
  wh25?: GatewayWh25[];
  ch_aisle?: GatewayChannel[];
  lightning?: GatewayLightningBlock[];
}

/** Leidend getal uit een GW1100-waarde ("7.92 km/h", "66%", "5.9 mm"). */
function gwNum(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const match = String(raw).match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** °C uit waarde + losse unit; converteert °F indien nodig. */
function toC(value: number | undefined, unit: string | undefined): number | undefined {
  if (value == null) return undefined;
  if (unit && unit.toUpperCase().includes("F")) {
    return round1(((value - 32) * 5) / 9);
  }
  return value;
}

/** km/u uit waarde-string; converteert mph indien aanwezig. */
function toKmh(raw: string | undefined): number | undefined {
  const n = gwNum(raw);
  if (n == null) return undefined;
  if (/mph/i.test(raw ?? "")) return round1(n * 1.60934);
  return n;
}

/** hPa uit waarde-string; converteert inHg indien aanwezig. */
function toHpa(raw: string | undefined): number | undefined {
  const n = gwNum(raw);
  if (n == null) return undefined;
  if (/inhg/i.test(raw ?? "")) return round1(n * 33.8639);
  return n;
}

/** mm uit waarde-string; converteert inch indien aanwezig. */
function toMm(raw: string | undefined): number | undefined {
  const n = gwNum(raw);
  if (n == null) return undefined;
  if (/in\b/i.test(raw ?? "") && !/min/i.test(raw ?? "")) return round1(n * 25.4);
  return n;
}

function indexById(items: GatewayItem[] | undefined): Map<string, GatewayItem> {
  const map = new Map<string, GatewayItem>();
  for (const item of items ?? []) {
    if (item.id != null) map.set(item.id.toLowerCase(), item);
  }
  return map;
}

function assignDefined<T>(
  out: Record<string, unknown>,
  key: string,
  value: T | undefined
): void {
  if (value !== undefined) out[key] = value;
}

/**
 * Map GW1100 /get_livedata_info → WeerLive-velden (wind, temp, vocht, zon, UV,
 * VPD, piezo-regen, binnenklimaat, kanaal 2). Waarden zijn al metrisch; eenheid
 * wordt defensief gecontroleerd. Bliksem blijft via mapGatewayLightning.
 */
export function mapGatewayLive(raw: GatewayLiveResponse): Partial<WeerLive> {
  const out: Record<string, unknown> = {};
  const common = indexById(raw.common_list);

  const tempItem = common.get("0x02");
  assignDefined(out, "temp_c", toC(gwNum(tempItem?.val), tempItem?.unit));
  assignDefined(out, "humidity", gwNum(common.get("0x07")?.val));

  assignDefined(out, "winddir", gwNum(common.get("0x0a")?.val));
  assignDefined(out, "windspeed_kmh", toKmh(common.get("0x0b")?.val));
  assignDefined(out, "windgust_kmh", toKmh(common.get("0x0c")?.val));
  assignDefined(out, "maxdailygust_kmh", toKmh(common.get("0x19")?.val));

  assignDefined(out, "solarradiation", gwNum(common.get("0x15")?.val));
  assignDefined(out, "uv", gwNum(common.get("0x17")?.val));
  assignDefined(out, "vpd", gwNum(common.get("5")?.val));

  const piezo = indexById(raw.piezoRain);
  assignDefined(out, "rainrate_piezo_mm", toMm(piezo.get("0x0e")?.val));
  assignDefined(out, "dailyrain_piezo_mm", toMm(piezo.get("0x10")?.val));
  assignDefined(out, "weeklyrain_piezo_mm", toMm(piezo.get("0x11")?.val));
  assignDefined(out, "monthlyrain_piezo_mm", toMm(piezo.get("0x12")?.val));
  assignDefined(out, "yearlyrain_piezo_mm", toMm(piezo.get("0x13")?.val));

  const indoor = raw.wh25?.[0];
  if (indoor) {
    assignDefined(out, "tempin_c", toC(gwNum(indoor.intemp), indoor.unit));
    assignDefined(out, "humidityin", gwNum(indoor.inhumi));
    assignDefined(out, "baromrel_hpa", toHpa(indoor.rel));
    assignDefined(out, "baromabs_hpa", toHpa(indoor.abs));
  }

  const ch2 = raw.ch_aisle?.find((c) => c.channel === "2");
  if (ch2) {
    assignDefined(out, "temp2_c", toC(gwNum(ch2.temp), ch2.unit));
    assignDefined(out, "humidity2", gwNum(ch2.humidity));
  }

  return out as Partial<WeerLive>;
}

function parseGatewayDistance(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("-") || trimmed.includes("F")) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  return Math.round(n);
}

function parseGatewayCount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseGatewayTimestamp(
  raw: string | undefined,
  dateutc?: string
): string | null {
  if (!raw || raw.includes("-") || raw.includes("F")) return null;
  const parsed = parseLightningTime(raw, dateutc);
  return parsed?.isoAmsterdam ?? null;
}

/** Map GW1100 /get_livedata_info → bliksemvelden voor merge in weer_live. */
export function mapGatewayLightning(
  raw: GatewayLiveResponse,
  dateutc?: string
): Partial<WeerLive> {
  const block = raw.lightning?.[0];
  if (!block) return {};

  const lightning_km = parseGatewayDistance(block.distance);
  const lightning_num = parseGatewayCount(block.count);
  const lightning_time =
    parseGatewayTimestamp(block.timestamp, dateutc) ??
    parseGatewayTimestamp(block.date, dateutc);

  const out: Partial<WeerLive> = {};
  if (lightning_km != null) {
    out.lightning_km = lightning_km;
    out.lightning = String(lightning_km);
  }
  if (lightning_num != null) out.lightning_num = lightning_num;
  if (lightning_time) out.lightning_time = lightning_time;
  if (block.battery != null && block.battery !== "") {
    out.wh57batt = block.battery;
  }
  return out;
}

export async function fetchGatewayLiveData(
  gatewayUrl: string
): Promise<GatewayLiveResponse | null> {
  const base = gatewayUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/get_livedata_info`, {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  return (await res.json()) as GatewayLiveResponse;
}
