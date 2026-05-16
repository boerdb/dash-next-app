import { HARLINGEN } from "@/lib/location";
import type { GetijItem } from "@/lib/api/types";
import { dagKeyAmsterdam } from "./day-label";
import { extractExtremes, type TidePoint } from "./extract-extremes";

interface OpenMeteoMarineResponse {
  hourly?: {
    time?: string[];
    sea_level_height_msl?: (number | null)[];
  };
}

function allowedDayKeys(): Set<string> {
  const today = dagKeyAmsterdam(new Date());
  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  return new Set([today, dagKeyAmsterdam(morgen)]);
}

export async function fetchHarlingenTides(): Promise<GetijItem[]> {
  const params = new URLSearchParams({
    latitude: String(HARLINGEN.latitude),
    longitude: String(HARLINGEN.longitude),
    hourly: "sea_level_height_msl",
    timezone: "Europe/Amsterdam",
    forecast_days: "2",
  });

  const res = await fetch(
    `https://marine-api.open-meteo.com/v1/marine?${params}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    throw new Error(`Open-Meteo tides: ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoMarineResponse;
  const times = data.hourly?.time ?? [];
  const heights = data.hourly?.sea_level_height_msl ?? [];

  const points: TidePoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const h = heights[i];
    if (h == null || times[i] == null) continue;
    points.push({ time: new Date(times[i]), heightM: h });
  }

  const allowed = allowedDayKeys();
  const dayPoints = points.filter((p) => allowed.has(dagKeyAmsterdam(p.time)));

  const extremes = extractExtremes(dayPoints.length >= 3 ? dayPoints : points)
    .filter((e) => allowed.has(e.dagKey))
    .sort((a, b) => a.at - b.at);

  if (extremes.length > 0) {
    const firstAt = extremes[0].at;
    const prev = [...points].reverse().find((p) => p.time.getTime() < firstAt);
    if (prev) {
      extremes[0] = {
        ...extremes[0],
        vorige_hoogte_db: prev.heightM.toFixed(2),
      };
    }
  }

  const seen = new Set<string>();
  return extremes.filter((e) => {
    const key = `${e.dagKey}-${e.type}-${e.tijd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
