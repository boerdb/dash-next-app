import type { WeerLive } from "@/lib/api/types";
import { parseLightningTime } from "@/lib/weer/lightning-time";
import { applyWs90RainPrimary } from "@/lib/weer/ws90-rain";

function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}

function inToHpa(inHg: number): number {
  return Math.round(inHg * 33.8639 * 10) / 10;
}

function mphToKmh(mph: number): number {
  return Math.round(mph * 1.60934 * 10) / 10;
}

function inToMm(inch: number): number {
  return Math.round(inch * 25.4 * 10) / 10;
}

function num(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function optionalNum(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Ruwe gateway-waarde (×0,02 V) of al volt (HP2550 stuurt bv. 3.18). */
function ws90Volts(raw: number): number {
  const v = raw > 10 ? raw * 0.02 : raw;
  return Math.round(v * 100) / 100;
}

/** Ecowitt POST/GET velden → WeerLive (zelfde logica als upload.php). */
export function parseEcowittPayload(
  input: Record<string, string>
): WeerLive {
  const metric: Record<string, unknown> = { ...input };

  const tempf = num(input.tempf);
  const temp2f = num(input.temp2f);
  const tempinf = num(input.tempinf);
  const barom = num(input.baromrelin);
  const baromAbs = num(input.baromabsin);
  const wspd = num(input.windspeedmph);
  const wavg = num(input.windspdmph_avg10m);
  const wgust = num(input.windgustmph);
  const maxGust = num(input.maxdailygust);
  const rainrate = num(input.rainratein);
  const rainratePiezo = num(input.rrain_piezo);
  const dailyrain = num(input.dailyrainin);
  const dailyrainPiezo = num(input.drain_piezo);
  const weeklyrain = num(input.weeklyrainin);
  const weeklyrainPiezo = num(input.wrain_piezo);
  const hourlyrain = num(input.hourlyrainin);
  const hourlyrainPiezo = num(input.hrain_piezo);
  const last24hrain = num(input.last24hrainin);
  const last24hrainPiezo = num(input.last24hrain_piezo);
  const monthlyrain = num(input.monthlyrainin);
  const monthlyrainPiezo = num(input.mrain_piezo);
  const yearlyrain = num(input.yearlyrainin);
  const yearlyrainPiezo = num(input.yrain_piezo);

  // tempf = buiten (WS90); temp2f = Ecowitt kanaal 2 (bijv. WH25 slaapkamer).
  if (tempf !== undefined) metric.temp_c = fToC(tempf);
  if (temp2f !== undefined) metric.temp2_c = fToC(temp2f);
  if (tempinf !== undefined) metric.tempin_c = fToC(tempinf);
  if (barom !== undefined) metric.baromrel_hpa = inToHpa(barom);
  if (baromAbs !== undefined) metric.baromabs_hpa = inToHpa(baromAbs);
  if (wspd !== undefined) metric.windspeed_kmh = mphToKmh(wspd);
  if (wavg !== undefined) metric.windspd_avg10m_kmh = mphToKmh(wavg);
  if (wgust !== undefined) metric.windgust_kmh = mphToKmh(wgust);
  if (maxGust !== undefined) metric.maxdailygust_kmh = mphToKmh(maxGust);
  if (rainrate !== undefined) metric.rainrate_mm = inToMm(rainrate);
  if (rainratePiezo !== undefined) metric.rainrate_piezo_mm = inToMm(rainratePiezo);
  if (dailyrain !== undefined) metric.dailyrain_mm = inToMm(dailyrain);
  if (dailyrainPiezo !== undefined) {
    metric.dailyrain_piezo_mm = inToMm(dailyrainPiezo);
  }
  if (weeklyrain !== undefined) metric.weeklyrain_mm = inToMm(weeklyrain);
  if (weeklyrainPiezo !== undefined) {
    metric.weeklyrain_piezo_mm = inToMm(weeklyrainPiezo);
  }
  if (hourlyrain !== undefined) metric.hourlyrain_mm = inToMm(hourlyrain);
  if (hourlyrainPiezo !== undefined) {
    metric.hourlyrain_piezo_mm = inToMm(hourlyrainPiezo);
  }
  if (last24hrain !== undefined) metric.last24hrain_mm = inToMm(last24hrain);
  if (last24hrainPiezo !== undefined) {
    metric.last24hrain_piezo_mm = inToMm(last24hrainPiezo);
  }
  if (monthlyrain !== undefined) metric.monthlyrain_mm = inToMm(monthlyrain);
  if (monthlyrainPiezo !== undefined) {
    metric.monthlyrain_piezo_mm = inToMm(monthlyrainPiezo);
  }
  if (yearlyrain !== undefined) metric.yearlyrain_mm = inToMm(yearlyrain);
  if (yearlyrainPiezo !== undefined) {
    metric.yearlyrain_piezo_mm = inToMm(yearlyrainPiezo);
  }

  if (input.humidity !== undefined) metric.humidity = num(input.humidity);
  if (input.humidity2 !== undefined) metric.humidity2 = num(input.humidity2);
  if (input.humidityin !== undefined) metric.humidityin = num(input.humidityin);
  if (input.winddir !== undefined) metric.winddir = num(input.winddir);
  if (input.winddir_avg10m !== undefined) {
    metric.winddir_avg10m = num(input.winddir_avg10m);
  }
  if (input.vpd !== undefined) metric.vpd = num(input.vpd);
  if (input.solarradiation !== undefined) {
    metric.solarradiation = num(input.solarradiation);
  }
  if (input.uv !== undefined) metric.uv = num(input.uv);

  metric.lightning_km = optionalNum(input.lightning);
  metric.lightning_num = optionalNum(input.lightning_num);
  const lightningParsed = parseLightningTime(input.lightning_time, input.dateutc);
  if (lightningParsed) {
    metric.lightning_time = lightningParsed.isoAmsterdam;
    metric.lightning_time_raw = lightningParsed.raw;
  } else if (input.lightning_time === "" || input.lightning_time === undefined) {
    metric.lightning_time = null;
    metric.lightning_time_raw = null;
  }

  const wh90 = num(input.wh90batt);
  if (wh90 !== undefined) {
    metric.ws90_voltage_v = ws90Volts(wh90);
  }
  const ws90Cap = num(input.ws90cap_volt);
  if (ws90Cap !== undefined) {
    metric.ws90_cap_voltage_v = ws90Volts(ws90Cap);
  }

  const tz = "Europe/Amsterdam";
  const dateutc = input.dateutc?.trim();
  if (dateutc) {
    const normalized = dateutc.replace(" ", "T");
    const measured = new Date(
      normalized.endsWith("Z") ? normalized : `${normalized}Z`
    );
    if (!Number.isNaN(measured.getTime())) {
      metric.server_timestamp = measured
        .toLocaleString("sv-SE", { timeZone: tz })
        .replace("T", " ")
        .slice(0, 19);
      metric.date_tracked = measured.toLocaleDateString("sv-SE", {
        timeZone: tz,
      });
    }
  }
  if (!metric.server_timestamp) {
    const now = new Date();
    metric.server_timestamp = now
      .toLocaleString("sv-SE", { timeZone: tz })
      .replace("T", " ")
      .slice(0, 19);
    metric.date_tracked = now.toLocaleDateString("sv-SE", { timeZone: tz });
  }

  const currentTemp = metric.temp_c != null ? Number(metric.temp_c) : null;
  if (currentTemp !== null && !Number.isNaN(currentTemp)) {
    metric.temp_min_c = currentTemp;
    metric.temp_max_c = currentTemp;
  }

  return applyWs90RainPrimary(metric as WeerLive);
}

/** Min/max vandaag behouden (was data.json op PHP). */
export function mergeDailyMinMax(
  fresh: WeerLive,
  previous: WeerLive | null
): WeerLive {
  const out = { ...fresh };
  const temp = out.temp_c != null ? Number(out.temp_c) : null;
  if (temp === null || Number.isNaN(temp)) return out;

  const today = out.date_tracked;
  if (
    previous &&
    previous.date_tracked === today &&
    previous.temp_min_c != null &&
    previous.temp_max_c != null
  ) {
    out.temp_min_c = Math.min(temp, Number(previous.temp_min_c));
    out.temp_max_c = Math.max(temp, Number(previous.temp_max_c));
  } else {
    out.temp_min_c = temp;
    out.temp_max_c = temp;
  }
  return out;
}

export function paramsFromSearchParams(
  searchParams: URLSearchParams
): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export async function paramsFromFormData(
  formData: FormData
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  formData.forEach((value, key) => {
    out[key] = String(value);
  });
  return out;
}
