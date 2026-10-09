import { HARLINGEN } from "@/lib/location";

/** Locatie voor lokale polygon-waarschuwingen (Harlingen). */
export const KNMI_WARNING_LOCATION = {
  label: "Harlingen",
  latitude: HARLINGEN.latitude,
  longitude: HARLINGEN.longitude,
} as const;

/** @deprecated Provinciecode — alleen nog voor legacy XML-fallback tot 2 nov 2026. */
export const KNMI_DEFAULT_PROVINCE = "FR" as const;

/** @deprecated Alleen legacy XML-fallback. */
export const KNMI_PROVINCE_LABELS: Record<string, string> = {
  WAE: "Waddengebied",
  GR: "Groningen",
  FR: "Friesland",
  DR: "Drenthe",
  NH: "Noord-Holland",
  FL: "Flevoland",
  OV: "Overijssel",
  GL: "Gelderland",
  UT: "Utrecht",
  ZH: "Zuid-Holland",
  ZE: "Zeeland",
  NB: "Noord-Brabant",
  LB: "Limburg",
  WAB: "Waddenzee boven water",
};

/** Nieuwe unified dataset (lokaal / polygon, vanaf 2 nov 2026). */
export const KNMI_PUBLIC_DATASET = "KNMI-public-weather-warnings";
export const KNMI_PUBLIC_DATASET_VERSION = "1.0";

/** Legacy provincie-dataset — fallback tot big-bang cutover. */
export const KNMI_LEGACY_DATASET = "waarschuwingen_nederland_48h";
export const KNMI_LEGACY_DATASET_VERSION = "1.0";

/** @deprecated Gebruik KNMI_PUBLIC_DATASET / KNMI_LEGACY_DATASET. */
export const KNMI_DATASET = KNMI_LEGACY_DATASET;
/** @deprecated Gebruik KNMI_PUBLIC_DATASET_VERSION / KNMI_LEGACY_DATASET_VERSION. */
export const KNMI_DATASET_VERSION = KNMI_LEGACY_DATASET_VERSION;

export const KNMI_OPEN_DATA_BASE =
  "https://api.dataplatform.knmi.nl/open-data/v1";

/** KNMI warning colour / legacy status → label (0 = geen waarschuwing). */
export const KNMI_WARNING_LEVEL_LABELS: Record<number, string> = {
  0: "Geen waarschuwing",
  1: "Code geel",
  2: "Code oranje",
  3: "Code rood",
};

export const KNMI_COLOR_TO_LEVEL: Record<string, 1 | 2 | 3> = {
  yellow: 1,
  orange: 2,
  red: 3,
};

export const KNMI_PHENOMENON_LABELS: Record<string, string> = {
  thunderstorm: "Onweersbuien",
  rain: "Zware regen",
  wind: "Windstoten",
  windgusts: "Windstoten",
  gust: "Windstoten",
  visibility: "Zicht",
  fog: "Mist",
  snow: "Gladheid door sneeuw",
  "freezing-rain": "Gladheid door ijzel",
  iciness: "Gladheid",
  heat: "Hitte",
  heatstress: "Hitte",
  "high-temperature": "Hitte",
  "low-temperature": "Kou",
  tornado: "Windhozen",
  waterspout: "Waterhozen",
  waterspouts: "Waterhozen",
  coastal: "Kust",
};
