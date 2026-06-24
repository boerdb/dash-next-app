import type { WeerLive } from "@/lib/api/types";

/** Zelfde formules als weer/api.php (dauwpunt + windchill). */
export function enrichWeerLive(data: WeerLive): WeerLive {
  const out = { ...data };

  const temp = out.temp_c != null ? Number(out.temp_c) : NaN;
  const humidity = out.humidity != null ? Number(out.humidity) : NaN;
  const windKmh = Number(
    out.windspd_avg10m_kmh ?? out.windspeed_kmh ?? NaN
  );

  if (!Number.isNaN(temp) && !Number.isNaN(humidity) && humidity > 0) {
    const a = 17.27;
    const b = 237.7;
    const alpha =
      ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    out.dauwpunt = Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  }

  if (!Number.isNaN(temp) && !Number.isNaN(windKmh)) {
    let gevoel = temp;
    if (temp <= 10 && windKmh > 4.8) {
      gevoel =
        13.12 +
        0.6215 * temp -
        11.37 * windKmh ** 0.16 +
        0.3965 * temp * windKmh ** 0.16;
    }
    out.gevoelstemperatuur = Math.round(gevoel * 10) / 10;
  }

  return out;
}
