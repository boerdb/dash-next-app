import type { WeerRadarFrame, WeerRadarResponse } from "@/lib/api/types";

const RAINVIEWER_MAPS_URL =
  "https://api.rainviewer.com/public/weather-maps.json";
const TZ = "Europe/Amsterdam";

export interface RainviewerMapsJson {
  version?: string;
  generated?: number;
  host?: string;
  radar?: {
    past?: Array<{ time?: number; path?: string }>;
    nowcast?: Array<{ time?: number; path?: string }>;
  };
}

function formatFrameLabel(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("nl-NL", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseRainviewerMaps(
  raw: RainviewerMapsJson,
  now = new Date()
): WeerRadarResponse {
  const host = raw.host?.replace(/\/$/, "") ?? "";
  const past = raw.radar?.past ?? [];

  const frames: WeerRadarFrame[] = past
    .filter(
      (f): f is { time: number; path: string } =>
        typeof f.time === "number" &&
        typeof f.path === "string" &&
        f.path.length > 0
    )
    .map((f) => ({
      time: f.time,
      label: formatFrameLabel(f.time),
      tilePath: f.path,
    }))
    .sort((a, b) => a.time - b.time);

  return {
    host,
    frames,
    generated: raw.generated ?? null,
    updatedAt: now.toISOString(),
  };
}

export function radarTileUrlTemplate(host: string, tilePath: string): string {
  const base = host.replace(/\/$/, "");
  const path = tilePath.startsWith("/") ? tilePath : `/${tilePath}`;
  return `${base}${path}/512/{z}/{x}/{y}/2/1_1.png`;
}

/** Eén composiet-radarafbeelding gecentreerd op lat/lon (betrouwbaarder dan Leaflet-tiles). */
export function radarCenterImageUrl(
  host: string,
  tilePath: string,
  lat: number,
  lon: number,
  zoom = 6
): string {
  const base = host.replace(/\/$/, "");
  const path = tilePath.startsWith("/") ? tilePath : `/${tilePath}`;
  return `${base}${path}/512/${zoom}/${lat}/${lon}/2/1_1.png`;
}

/** Voor tests: concrete tile-URL op zoom/x/y. */
export function radarTileUrl(
  host: string,
  tilePath: string,
  z: number,
  x: number,
  y: number
): string {
  return radarTileUrlTemplate(host, tilePath)
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export async function fetchRainviewerRadar(): Promise<WeerRadarResponse> {
  const res = await fetch(RAINVIEWER_MAPS_URL, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`RainViewer: ${res.status}`);
  }
  const raw = (await res.json()) as RainviewerMapsJson;
  return parseRainviewerMaps(raw);
}
