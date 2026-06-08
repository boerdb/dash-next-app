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

/** Land en water zonder labels (contouren blijven zichtbaar onder radar). */
export const BASE_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

/** Plaatsnamen en wegen bovenop de radar-overlay. */
export const LABELS_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

export const BASE_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>';

/** Lager = meer kust/land zichtbaar door de neerslag (zoals Buienradar). */
export const RADAR_LAYER_OPACITY = 0.55;
