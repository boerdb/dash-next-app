export interface WeerLive {
  dateutc?: string;
  date_tracked?: string;
  temp_c?: number;
  /** Ecowitt kanaal 2 (bijv. WH25 slaapkamer), niet de bliksemsensor */
  temp2_c?: number;
  humidity2?: number | string;
  tempin_c?: number;
  gevoelstemperatuur?: number | string;
  /** Hitte-index (°C) bij warm + vochtig weer; vanaf ca. 27 °C. */
  hitte_index_c?: number | string;
  temp_min_c?: number | string;
  temp_max_c?: number | string;
  dauwpunt?: number | string;
  /** Vapor pressure deficit (kPa), nieuwere firmware */
  vpd?: number | string;
  humidity?: number | string;
  humidityin?: number | string;
  winddir?: number;
  winddir_avg10m?: number | string;
  windspeed_kmh?: number;
  windspd_avg10m_kmh?: number;
  windgust_kmh?: number;
  maxdailygust_kmh?: number;
  dailyrain_mm?: number;
  /** WS90 piezo-regen (mm), naast of i.p.v. WH65 */
  dailyrain_piezo_mm?: number;
  rainrate_piezo_mm?: number;
  weeklyrain_mm?: number;
  hourlyrain_mm?: number;
  last24hrain_mm?: number;
  monthlyrain_mm?: number | string;
  yearlyrain_mm?: number | string;
  rainrate_mm?: number;
  baromrel_hpa?: number;
  baromabs_hpa?: number;
  /** Drukverandering over barom_trend_hours (standaard 3 uur). */
  barom_trend_delta_hpa?: number;
  barom_trend_hours?: number;
  barom_trend_direction?: "up" | "down" | "steady";
  barom_trend_label?: string;
  /** WH57 / gateway: afstand laatste inslag (km) */
  lightning_km?: number | null;
  /** Aantal inslagen vandaag */
  lightning_num?: number | null;
  /** Laatste inslag (Amsterdam wall clock) */
  lightning_time?: string | null;
  lightning_time_raw?: number | null;
  /** WH57 / barometer: kans op onweer (console-icoon zonder inslag). */
  lightning_storm_risk?: boolean;
  /** WS90 batterijspanning (V) */
  ws90_voltage_v?: number;
  ws90_cap_voltage_v?: number;
  /** Ecowitt batterijvelden (ruw) */
  wh65batt?: number | string;
  wh25batt?: number | string;
  wh57batt?: number | string;
  wh90batt?: number | string;
  batt2?: number | string;
  stationtype?: string;
  model?: string;
  /** Laatste update per bron bij merged ingest. */
  weer_sources?: {
    gw1100_at?: string | null;
    hp2550_at?: string | null;
  };
  freq?: string;
  uv?: number | string;
  solarradiation?: number | string;
  tide_info?: string;
  server_timestamp?: string;
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { gw1100_at?: string | null; hp2550_at?: string | null };
}

export interface WeerHistorie {
  labels: string[];
  temperatures: (number | string)[];
  gemiddelde: number;
}

export interface WeerRegenJaarMaand {
  maand: number;
  label: string;
  regen_mm: number;
}

export interface WeerRegenJaarResponse {
  jaar: number;
  maanden: WeerRegenJaarMaand[];
  jaar_totaal_mm: number;
  vandaag: string;
  kan_vorige_jaar: boolean;
  kan_volgende_jaar: boolean;
}

export interface WeerRadarFrame {
  time: number;
  label: string;
  tilePath: string;
}

export interface WeerRadarResponse {
  host: string;
  frames: WeerRadarFrame[];
  generated: number | null;
  updatedAt: string;
}

export interface GetijItem {
  type: "HW" | "LW";
  tijd: string;
  hoogte: string;
  /** Vandaag / Morgen — voor weergave */
  dagLabel: string;
  /** Sorteer- en vergelijk-key (YYYY-MM-DD in Amsterdam) */
  dagKey: string;
  /** Unix-ms voor “Nu”-highlight en live status */
  at: number;
  vorige_hoogte_db?: string;
}

export interface GetijdenResponse {
  items: GetijItem[];
  source: "rws" | "open-meteo";
}

import type {
  BatterijGroep,
  BatterijHistorie,
  BatterijLive,
} from "@/lib/homewizard/battery";

export type { BatterijGroep, BatterijHistorie, BatterijLive } from "@/lib/homewizard/battery";
export type { EnphaseLive } from "@/lib/enphase/types";

export interface EnergieApiRaw {
  active_power_w?: number;
  active_tariff?: number;
  total_power_import_kwh?: number;
  total_power_export_kwh?: number;
  vandaag_stroom_in_kwh?: number | string;
  vandaag_stroom_out_kwh?: number | string;
  vandaag_gas_m3?: number | string;
  total_gas_m3?: number | string;
  vandaag_water_l?: number | string;
  total_liter_m3?: number | string;
  total_liter_offset_m3?: number | string;
  active_liter_lpm?: number | string;
  error?: string;
  /** Door energie-store gezet vóór mapEnergieLive */
  batterijen?: BatterijLive[];
  batterij_groep?: BatterijGroep | null;
  batterij_hint?: string | null;
  batterij_historie?: BatterijHistorie;
  enphase?: import("@/lib/enphase/types").EnphaseLive;
}

export interface EnergieLive {
  stroom_nu: number;
  tarief: number;
  stroom_vandaag_in: number | string;
  stroom_vandaag_uit: number | string;
  gas_vandaag: number | string;
  water_vandaag: number | string;
  water_actueel: number;
  /** Geschatte fysieke meterstand (m³) voor opgave */
  water_meterstand_m3: number | null;
  water_meterstand_label: string | null;
  batterijen: BatterijLive[];
  batterij_groep: BatterijGroep | null;
  batterij_vermogen_totaal: number;
  batterij_soc_gemiddeld: number | null;
  batterij_hint: string | null;
  batterij_historie: BatterijHistorie;
  enphase: import("@/lib/enphase/types").EnphaseLive | null;
}

export interface EnergieHistorie {
  labels: string[];
  wattage: (number | null)[];
  gemiddelde: number;
}

export interface EnergieMaandDag {
  dag: string;
  label: string;
  net_in_kwh: number;
  net_uit_kwh: number;
  batterij_kwh: number;
}

export interface EnergieMaandResponse {
  jaar: number;
  maand: number;
  maand_label: string;
  dagen: EnergieMaandDag[];
  vandaag: string;
  kan_vorige_maand: boolean;
  kan_volgende_maand: boolean;
}

export type WeatherCondition =
  | "rain"
  | "snow"
  | "thunder"
  | "storm"
  | "wind"
  | "fog"
  | "night"
  | "evening"
  | "dawn"
  | "sunny"
  | "partly-cloudy"
  | "cloudy";

/** Regenvoorspelling (Open-Meteo, uurlijks). */
export interface PrecipForecastSlot {
  at: number;
  label: string;
  precipitationMm: number;
  probabilityPct: number | null;
}

/** Actuele lucht (Open-Meteo) voor hero-achtergrond. */
export interface OpenMeteoSky {
  cloudCoverPct: number;
  weatherCode: number;
  precipitationMm: number;
  /** Gemeten kortgolvige instraling (W/m²); betrouwbaarder dan bewolking/weercode bij lokale afwijkingen. */
  shortwaveRadiationWm2: number | null;
}

export interface PrecipForecastResponse {
  slots: PrecipForecastSlot[];
  hours: number;
  currentSky: OpenMeteoSky | null;
  source: "open-meteo";
  updatedAt: string;
}

/** Officiële KNMI-provinciewaarschuwingen (waarschuwingen_nederland_48h). */
export interface KnmiWarningItem {
  level: 1 | 2 | 3;
  levelLabel: string;
  phenomenonId: string;
  phenomenonLabel: string;
  validFrom: string;
  validTo: string;
  texts: string[];
}

export interface KnmiWaarschuwingenApi {
  province: string;
  maxLevel: 0 | 1 | 2 | 3;
  maxLevelLabel: string;
  warnings: KnmiWarningItem[];
  sourceFile: string | null;
  updatedAt: string;
}

export interface AstronomieApi {
  period: "night" | "dawn" | "day" | "evening";
  sunriseLabel: string;
  sunsetLabel: string;
  daylightHoursLabel: string;
  sunProgress: number;
  sunBelowHorizon: boolean;
  sunAltitudeDeg: number;
  moon: {
    phase: number;
    fraction: number;
    label: string;
    illuminationPct: number;
  };
}
