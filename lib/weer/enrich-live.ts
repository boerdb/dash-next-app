import type { WeerLive } from "@/lib/api/types";
import { computeHeatIndexC } from "@/lib/weer/heat-index";
import { applyWs90RainPrimary } from "@/lib/weer/ws90-rain";
import { WIND_CHILL_MAX_TEMP_C, WIND_CHILL_MIN_WIND_KMH } from "@/lib/weer/wind-chill-display";

/** Zelfde formules als weer/api.php (dauwpunt + windchill). */
export function enrichWeerLive(data: WeerLive): WeerLive {
  const out = applyWs90RainPrimary({ ...data });

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

    const hitteIndex = computeHeatIndexC(temp, humidity);
    if (hitteIndex != null) {
      out.hitte_index_c = hitteIndex;
    } else {
      delete out.hitte_index_c;
    }
  }

  if (!Number.isNaN(temp) && !Number.isNaN(windKmh)) {
    let gevoel = temp;
    if (temp <= WIND_CHILL_MAX_TEMP_C && windKmh >= WIND_CHILL_MIN_WIND_KMH) {
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
