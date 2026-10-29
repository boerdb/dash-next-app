import { HARLINGEN } from "@/lib/location";
import type { NearbyVisibility } from "@/lib/api/types";

/** Buienradar-feed: actuele KNMI-stationsmetingen, gratis en zonder sleutel. */
export const BUIENRADAR_FEED_URL = "https://data.buienradar.nl/2.0/feed/json";

/** Stations binnen deze straal (Leeuwarden, Vlieland, Terschelling, Stavoren). */
const MAX_DISTANCE_KM = 40;

interface BuienradarStation {
  stationname?: string;
  lat?: number;
  lon?: number;
  visibility?: number | null;
  timestamp?: string;
}

interface BuienradarFeed {
  actual?: { stationmeasurements?: BuienradarStation[] };
}

function distanceKm(lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat - HARLINGEN.latitude) * rad;
  const dLon = (lon - HARLINGEN.longitude) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(HARLINGEN.latitude * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Laagste gemeten zicht van KNMI-stations rond Harlingen. Mist is vaak
 * plaatselijk en Open-Meteo (model) mist hem regelmatig; gemeten zicht niet.
 */
export function parseNearbyVisibility(feed: unknown): NearbyVisibility | null {
  const stations = (feed as BuienradarFeed)?.actual?.stationmeasurements;
  if (!Array.isArray(stations)) return null;

  let best: NearbyVisibility | null = null;
  for (const s of stations) {
    const vis = Number(s.visibility);
    if (s.visibility == null || !Number.isFinite(vis) || vis < 0) continue;
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue;
    const km = distanceKm(Number(s.lat), Number(s.lon));
    if (km > MAX_DISTANCE_KM) continue;
    if (!best || vis < best.visibilityM) {
      best = {
        stationName: (s.stationname ?? "").replace(/^Meetstation\s+/, ""),
        visibilityM: vis,
        distanceKm: Math.round(km),
        measuredAt: s.timestamp ?? null,
      };
    }
  }
  return best;
}

export async function fetchNearbyVisibility(): Promise<NearbyVisibility | null> {
  const res = await fetch(BUIENRADAR_FEED_URL, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Buienradar-feed: ${res.status}`);
  return parseNearbyVisibility(await res.json());
}
