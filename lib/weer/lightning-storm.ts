import type { WeerLive } from "@/lib/api/types";
import { isRecentLightningStrike } from "@/lib/weer/lightning-time";
import { hasLightningSensor } from "@/lib/weer/sensor-status";

const WH57_MAX_KM = 40;
const NL_TZ = "Europe/Amsterdam";
/** Console houdt onweersicoon vaak uren actief na trigger. */
export const STORM_RISK_LATCH_MS = 4 * 60 * 60 * 1000;

/** Live-poll interval weerpagina (ms). */
export const LIGHTNING_POLL_NORMAL_MS = 30_000;
export const LIGHTNING_POLL_ACTIVE_MS = 5_000;
/** Max. frequentie GW1100 WH57-aanvulling tijdens onweer (ms). */
export const GATEWAY_LIGHTNING_SUPPLEMENT_MS = 5_000;

function fieldPresent(data: WeerLive, key: keyof WeerLive): boolean {
  const v = data[key];
  return v !== undefined && v !== "";
}

function latchUntilIso(now: number): string {
  return new Date(now + STORM_RISK_LATCH_MS)
    .toLocaleString("sv-SE", { timeZone: NL_TZ })
    .replace("T", " ")
    .slice(0, 19);
}

function parseUntilIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Recente inslag binnen WH57-bereik. */
export function isRecentLightningStrikeNearby(data: WeerLive): boolean {
  const km = data.lightning_km;
  if (km == null || km <= 0 || km > WH57_MAX_KM) return false;
  return isRecentLightningStrike(data.lightning_time ?? undefined);
}

/**
 * Onweersfront / kans op onweer zonder bevestigde inslag.
 * GW1100 kan afstand melden vóórdat lightning_time gezet is.
 */
export function isLightningStormFront(data: WeerLive): boolean {
  const km = data.lightning_km;
  if (km == null || km <= 0 || km > WH57_MAX_KM) return false;
  if (data.lightning_time) return false;
  return fieldPresent(data, "wh57batt");
}

/** Console-achtige stormvoorspelling uit dalende druk + warm vochtig weer. */
export function isBarometerStormForecast(data: WeerLive): boolean {
  const delta = Number(data.barom_trend_delta_hpa);
  const temp = Number(data.temp_c);
  const humidity = Number(data.humidity);
  if (!fieldPresent(data, "wh57batt")) return false;
  if (!Number.isFinite(delta) || delta > -0.8) return false;
  if (!Number.isFinite(temp) || temp < 24) return false;
  if (!Number.isFinite(humidity) || humidity < 45) return false;
  return data.barom_trend_direction === "down";
}

/** Warm vochtige lucht + WH57: onweersomgeving (HP2550-icoon zonder nieuwe drukdaling). */
export function isConvectiveStormSetup(data: WeerLive): boolean {
  if (!fieldPresent(data, "wh57batt")) return false;
  const temp = Number(data.temp_c);
  const humidity = Number(data.humidity);
  const heatIndex = Number(data.hitte_index_c);
  const delta = Number(data.barom_trend_delta_hpa);
  if (!Number.isFinite(temp) || temp < 28) return false;
  if (!Number.isFinite(humidity) || humidity < 45) return false;
  if (Number.isFinite(heatIndex) && heatIndex >= 36) return true;
  if (temp >= 32 && humidity >= 50 && Number.isFinite(delta) && delta <= 0) {
    return true;
  }
  return false;
}

export function shouldClearStormRiskLatch(data: WeerLive): boolean {
  const delta = Number(data.barom_trend_delta_hpa);
  return (
    data.barom_trend_direction === "up" &&
    Number.isFinite(delta) &&
    delta >= 0.8
  );
}

export function computeLightningStormRisk(data: WeerLive): boolean {
  if (isRecentLightningStrikeNearby(data)) return true;
  if (isLightningStormFront(data)) return true;
  if (isBarometerStormForecast(data)) return true;
  if (isConvectiveStormSetup(data)) return true;
  return false;
}

/** Berekent stormkans incl. latch (voor ingest én live). */
export function resolveLightningStormRisk(
  data: WeerLive,
  previous: WeerLive | null,
  now = Date.now()
): WeerLive {
  if (shouldClearStormRiskLatch(data)) {
    const immediate = computeLightningStormRisk(data);
    return {
      ...data,
      lightning_storm_risk: immediate,
      lightning_storm_risk_until: immediate ? latchUntilIso(now) : null,
    };
  }

  const immediate = computeLightningStormRisk(data);
  if (immediate) {
    return {
      ...data,
      lightning_storm_risk: true,
      lightning_storm_risk_until: latchUntilIso(now),
    };
  }

  const untilMs = parseUntilIso(previous?.lightning_storm_risk_until);
  if (untilMs != null && untilMs > now) {
    return {
      ...data,
      lightning_storm_risk: true,
      lightning_storm_risk_until: previous?.lightning_storm_risk_until ?? null,
    };
  }

  return {
    ...data,
    lightning_storm_risk: false,
    lightning_storm_risk_until: null,
  };
}

export function pickBestLightningFields(
  ...sources: WeerLive[]
): Partial<WeerLive> {
  let best: WeerLive | null = null;
  let bestScore = -1;

  for (const source of sources) {
    let score = 0;
    const km = source.lightning_km;
    if (km != null && km > 0) score += 20;
    if (source.lightning_time) score += 10;
    if (source.lightning_num != null && source.lightning_num > 0) score += 5;
    if (fieldPresent(source, "wh57batt")) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = source;
    }
  }

  if (!best) return {};

  return {
    lightning_km: best.lightning_km,
    lightning_num: best.lightning_num,
    lightning_time: best.lightning_time,
    lightning_time_raw: best.lightning_time_raw,
    lightning: best.lightning as string | undefined,
    wh57batt: best.wh57batt,
  };
}

export type LightningStatusKind = "strike" | "risk" | "idle";

export type LightningRiskReason =
  | "strike"
  | "storm_front"
  | "barometer"
  | "convective"
  | "latched"
  | null;

export function getLightningRiskReason(data: WeerLive): LightningRiskReason {
  if (isRecentLightningStrikeNearby(data)) return "strike";
  if (isLightningStormFront(data)) return "storm_front";
  if (isBarometerStormForecast(data)) return "barometer";
  if (isConvectiveStormSetup(data)) return "convective";
  if (data.lightning_storm_risk && data.lightning_storm_risk_until) {
    return "latched";
  }
  return null;
}

export function getLightningStatus(data: WeerLive): LightningStatusKind {
  if (isRecentLightningStrikeNearby(data)) return "strike";
  if (data.lightning_storm_risk === true) return "risk";
  if (computeLightningStormRisk(data)) return "risk";
  return "idle";
}

/** Snellere live-poll + gateway-sync bij actief onweer / WH57-detectie. */
export function shouldAccelerateLightningPoll(
  data: WeerLive | null | undefined
): boolean {
  if (!data) return false;
  if (getLightningStatus(data) !== "idle") return true;
  const km = data.lightning_km;
  if (km != null && km > 0 && km <= WH57_MAX_KM) return true;
  if (hasLightningSensor(data)) {
    const num = Number(data.lightning_num);
    if (Number.isFinite(num) && num > 0) return true;
  }
  return false;
}

export function getLightningStatusLabel(data: WeerLive): string {
  const reason = getLightningRiskReason(data);
  if (reason === "strike") return "Recente inslag gedetecteerd";
  if (reason === "storm_front") return "WH57 detecteert onweersfront";
  if (reason === "barometer") return "Kans op onweer (barometer)";
  if (reason === "convective") return "Kans op onweer · warm & vochtig";
  if (reason === "latched") return "Kans op onweer · nog actief";
  return "WH57 actief · geen inslagen";
}
