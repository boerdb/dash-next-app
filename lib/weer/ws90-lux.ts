import type { WeerLive } from "@/lib/api/types";
import { hasWs90Sensor } from "@/lib/weer/sensor-status";

/** Ecowitt WS90: zonstraling (W/m²) ≈ lux / 126,7. */
export const ECOWITT_SOLAR_LUX_FACTOR = 126.7;

function finite(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function solarWm2FromLux(lux: number): number {
  return Math.round((lux / ECOWITT_SOLAR_LUX_FACTOR) * 100) / 100;
}

export function luxFromSolarWm2(solarWm2: number): number {
  return Math.round(solarWm2 * ECOWITT_SOLAR_LUX_FACTOR);
}

/** Parse GW1100 common_list 0x15 (lux of W/m², soms in de waarde-string). */
export function parseGatewayLightReading(raw: string | undefined): {
  lux?: number;
  solarWm2?: number;
} {
  if (!raw?.trim()) return {};
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return {};
  const n = Number(match[0]);
  if (!Number.isFinite(n)) return {};

  const label = raw.toLowerCase();
  if (/klux/.test(label)) {
    const lux = Math.round(n * 1000);
    return { lux, solarWm2: solarWm2FromLux(lux) };
  }
  if (/lux/.test(label)) {
    const lux = Math.round(n);
    return { lux, solarWm2: solarWm2FromLux(lux) };
  }
  if (/w\s*\/?\s*m/.test(label)) {
    const solarWm2 = Math.round(n * 100) / 100;
    return { solarWm2, lux: luxFromSolarWm2(solarWm2) };
  }

  const lux = Math.round(n);
  return { lux, solarWm2: solarWm2FromLux(lux) };
}

/** Huidige lux: expliciet veld, anders afgeleid uit zonstraling (WS90). */
export function resolveIlluminanceLux(data: WeerLive): number | undefined {
  const direct = finite(data.illuminance_lux);
  if (direct != null && direct >= 0) return direct;

  if (!hasWs90Sensor(data)) return undefined;
  const solar = finite(data.solarradiation);
  if (solar == null || solar < 0) return undefined;
  return luxFromSolarWm2(solar);
}

/** Vult illuminance_lux aan uit upload of zonstraling. */
export function applyWs90Lux(data: WeerLive): WeerLive {
  const direct = finite(data.illuminance_lux);
  if (direct != null && direct >= 0) return data;

  const lux = resolveIlluminanceLux(data);
  if (lux == null) return data;
  return { ...data, illuminance_lux: lux };
}
