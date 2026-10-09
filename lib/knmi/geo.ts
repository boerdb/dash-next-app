/** GeoJSON position: [longitude, latitude]. */
export type LonLat = readonly [number, number];

/**
 * Ray-casting point-in-polygon for a closed GeoJSON ring ([lon, lat][]).
 * Rings without holes (KNMI: no holes, counterclockwise).
 */
export function pointInRing(
  lon: number,
  lat: number,
  ring: ReadonlyArray<ReadonlyArray<number>>
): boolean {
  if (ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (
      xi === undefined ||
      yi === undefined ||
      xj === undefined ||
      yj === undefined
    ) {
      continue;
    }

    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(
  lon: number,
  lat: number,
  coordinates: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>
): boolean {
  const outer = coordinates[0];
  if (!outer) return false;
  return pointInRing(lon, lat, outer);
}

export function pointInMultiPolygon(
  lon: number,
  lat: number,
  coordinates: ReadonlyArray<
    ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>
  >
): boolean {
  return coordinates.some((polygon) => pointInPolygon(lon, lat, polygon));
}

export function pointInGeoJsonArea(
  lon: number,
  lat: number,
  area: { type?: string; coordinates?: unknown } | null | undefined
): boolean {
  if (!area?.coordinates || !Array.isArray(area.coordinates)) return false;
  const type = (area.type ?? "Polygon").toLowerCase();

  if (type === "polygon") {
    return pointInPolygon(
      lon,
      lat,
      area.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>
    );
  }
  if (type === "multipolygon") {
    return pointInMultiPolygon(
      lon,
      lat,
      area.coordinates as ReadonlyArray<
        ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>
      >
    );
  }
  return false;
}
