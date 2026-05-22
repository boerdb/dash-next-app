import type { WeerLive } from "@/lib/api/types";

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

/** Ecowitt POST/GET velden → WeerLive (zelfde logica als upload.php). */
export function parseEcowittPayload(
  input: Record<string, string>
): WeerLive {
  const metric: Record<string, unknown> = { ...input };

  const tempf = num(input.tempf);
  const temp2f = num(input.temp2f);
  const tempinf = num(input.tempinf);
  const barom = num(input.baromrelin);
  const wspd = num(input.windspeedmph);
  const wavg = num(input.windspdmph_avg10m);
  const wgust = num(input.windgustmph);
  const rainrate = num(input.rainratein);
  const dailyrain = num(input.dailyrainin);
  const monthlyrain = num(input.monthlyrainin);
  const yearlyrain = num(input.yearlyrainin);

  // HP2550/EasyWeather toont tempf (hoofdsensor); temp2f = tweede buitensensor (WH25).
  if (tempf !== undefined) metric.temp_c = fToC(tempf);
  if (temp2f !== undefined) metric.temp2_c = fToC(temp2f);
  if (tempinf !== undefined) metric.tempin_c = fToC(tempinf);
  if (barom !== undefined) metric.baromrel_hpa = inToHpa(barom);
  if (wspd !== undefined) metric.windspeed_kmh = mphToKmh(wspd);
  if (wavg !== undefined) metric.windspd_avg10m_kmh = mphToKmh(wavg);
  if (wgust !== undefined) metric.windgust_kmh = mphToKmh(wgust);
  if (rainrate !== undefined) metric.rainrate_mm = inToMm(rainrate);
  if (dailyrain !== undefined) metric.dailyrain_mm = inToMm(dailyrain);
  if (monthlyrain !== undefined) metric.monthlyrain_mm = inToMm(monthlyrain);
  if (yearlyrain !== undefined) metric.yearlyrain_mm = inToMm(yearlyrain);

  if (input.humidity !== undefined) metric.humidity = num(input.humidity);
  if (input.humidityin !== undefined) metric.humidityin = num(input.humidityin);
  if (input.winddir !== undefined) metric.winddir = num(input.winddir);
  if (input.solarradiation !== undefined) {
    metric.solarradiation = num(input.solarradiation);
  }
  if (input.uv !== undefined) metric.uv = num(input.uv);

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

  return metric as WeerLive;
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
