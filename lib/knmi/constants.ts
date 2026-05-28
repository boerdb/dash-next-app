/** Provinciecode in KNMI waarschuwingen-XML (Harlingen = Friesland). */
export const KNMI_DEFAULT_PROVINCE = "FR" as const;

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

export const KNMI_DATASET = "waarschuwingen_nederland_48h";
export const KNMI_DATASET_VERSION = "1.0";
export const KNMI_OPEN_DATA_BASE =
  "https://api.dataplatform.knmi.nl/open-data/v1";

/** KNMI location_warning_status → label (0 = geen waarschuwing). */
export const KNMI_WARNING_LEVEL_LABELS: Record<number, string> = {
  0: "Geen waarschuwing",
  1: "Code geel",
  2: "Code oranje",
  3: "Code rood",
};

export const KNMI_PHENOMENON_LABELS: Record<string, string> = {
  thunderstorm: "Onweersbuien",
  rain: "Regen",
  wind: "Wind",
  windgusts: "Windstoten",
  gust: "Windstoten",
  visibility: "Zicht",
  fog: "Mist",
  snow: "Sneeuw",
  iciness: "Gladheid",
  heat: "Hitte",
  heatstress: "Hitte",
  tornado: "Windhozen",
  waterspout: "Wind-/waterhozen",
  coastal: "Kust",
};
