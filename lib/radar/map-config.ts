import { HARLINGEN } from "@/lib/location";

/** Heel Nederland zichtbaar met Friesland herkenbaar. */
export const NL_MAP_CENTER = {
  lat: 52.15,
  lng: 5.35,
} as const;

export const NL_MAP_ZOOM = 6;

export const NL_MAP_MIN_ZOOM = 5;
export const NL_MAP_MAX_ZOOM = 7;

export const HARLINGEN_MARKER = HARLINGEN;

/**
 * Esri World Light Gray — publieke tiles, geen API-key.
 * CARTO Voyager watermerkt sinds 2024 zonder account ("API key required").
 * Let op: Esri gebruikt {z}/{y}/{x}, niet {z}/{x}/{y}.
 */
export const BASE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

/** Plaatsnamen bovenop de radar-overlay. */
export const LABELS_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export const BASE_TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

/** Lager = meer kust/land zichtbaar door de neerslag (zoals Buienradar). */
export const RADAR_LAYER_OPACITY = 0.55;
