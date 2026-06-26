import type { WeerLive } from "@/lib/api/types";
import { pickBestLightningFields } from "@/lib/weer/lightning-storm";

export type WeerDataSource = "gw1100" | "hp2550" | "unknown";

const GW_PATTERN = /GW(?:1000|1100|1200|2000|3000)/;
const HP_PATTERN = /HP2550|HP3500|HP3501|EASYWEATHER|WS3800|WS3910/;

export function detectWeerDataSource(data: WeerLive): WeerDataSource {
  const label = `${data.stationtype ?? ""} ${data.model ?? ""}`.toUpperCase();
  if (GW_PATTERN.test(label)) return "gw1100";
  if (HP_PATTERN.test(label)) return "hp2550";
  return "unknown";
}

const GW_OUTDOOR_KEYS = [
  "temp_c",
  "tempf",
  "humidity",
  "vpd",
  "winddir",
  "winddir_avg10m",
  "windspeed_kmh",
  "windspeedmph",
  "windspd_avg10m_kmh",
  "windgust_kmh",
  "windgustmph",
  "maxdailygust_kmh",
  "maxdailygust",
  "solarradiation",
  "uv",
  "rainrate_mm",
  "rainrate_piezo_mm",
  "dailyrain_mm",
  "dailyrain_piezo_mm",
  "weeklyrain_mm",
  "hourlyrain_mm",
  "last24hrain_mm",
  "monthlyrain_mm",
  "yearlyrain_mm",
  "ws90_voltage_v",
  "ws90_cap_voltage_v",
  "wh90batt",
  "ws90cap_volt",
  "ws90_ver",
] as const;

const HP_INDOOR_KEYS = [
  "tempin_c",
  "tempinf",
  "humidityin",
  "temp2_c",
  "temp2f",
  "humidity2",
  "wh25batt",
  "batt2",
] as const;

function pickDefined<T extends WeerLive>(
  source: T,
  keys: readonly (keyof WeerLive)[]
): Partial<WeerLive> {
  const out: Partial<WeerLive> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
}

/** Combineert GW1100 (buiten/sensoren) met HP2550 (console/binnen). */
export function mergeWeerLiveBySource(
  incoming: WeerLive,
  existing: WeerLive | null
): WeerLive {
  if (!existing) return incoming;

  const incomingSource = detectWeerDataSource(incoming);
  const existingSource = detectWeerDataSource(existing);

  if (incomingSource === "unknown" || existingSource === "unknown") {
    return { ...existing, ...incoming };
  }

  if (incomingSource === existingSource) {
    return { ...existing, ...incoming };
  }

  const gw =
    incomingSource === "gw1100"
      ? incoming
      : existingSource === "gw1100"
        ? existing
        : incoming;
  const hp =
    incomingSource === "hp2550"
      ? incoming
      : existingSource === "hp2550"
        ? existing
        : existing;

  return {
    ...existing,
    ...hp,
    ...gw,
    ...pickDefined(gw, GW_OUTDOOR_KEYS),
    ...pickDefined(hp, HP_INDOOR_KEYS),
    ...pickBestLightningFields(gw, hp),
    stationtype: gw.stationtype ?? existing.stationtype,
    model: gw.model ?? existing.model,
    dateutc: incoming.dateutc ?? gw.dateutc ?? hp.dateutc,
    server_timestamp:
      incoming.server_timestamp ?? gw.server_timestamp ?? hp.server_timestamp,
    weer_sources: {
      gw1100_at: gw.server_timestamp ?? null,
      hp2550_at: hp.server_timestamp ?? null,
    },
  };
}
