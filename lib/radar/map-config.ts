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

/** Carto Voyager — duidelijke labels en kustlijn. */
export const BASE_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const BASE_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>';
