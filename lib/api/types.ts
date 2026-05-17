export interface WeerLive {
  temp_c?: number;
  tempin_c?: number;
  gevoelstemperatuur?: number | string;
  temp_min_c?: number | string;
  temp_max_c?: number | string;
  dauwpunt?: number | string;
  humidity?: number | string;
  humidityin?: number | string;
  winddir?: number;
  windspd_avg10m_kmh?: number;
  windgust_kmh?: number;
  dailyrain_mm?: number;
  monthlyrain_mm?: number | string;
  yearlyrain_mm?: number | string;
  rainrate_mm?: number;
  baromrel_hpa?: number;
  uv?: number | string;
  solarradiation?: number | string;
  tide_info?: string;
  server_timestamp?: string;
}

export interface WeerHistorie {
  labels: string[];
  temperatures: (number | string)[];
  gemiddelde: number;
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

export interface EnergieApiRaw {
  active_power_w?: number;
  active_tariff?: number;
  vandaag_stroom_in_kwh?: number | string;
  vandaag_stroom_out_kwh?: number | string;
  vandaag_gas_m3?: number | string;
  total_gas_m3?: number | string;
  vandaag_water_l?: number | string;
  total_liter_m3?: number | string;
  active_liter_lpm?: number | string;
}

export interface EnergieLive {
  stroom_nu: number;
  tarief: number;
  stroom_vandaag_in: number | string;
  stroom_vandaag_uit: number | string;
  gas_vandaag: number | string;
  water_vandaag: number | string;
  water_actueel: number;
}

export interface EnergieHistorie {
  labels: string[];
  wattage: number[];
  gemiddelde: number;
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

/** Aanvulling van OpenWeather — station blijft leidend voor live waarden. */
export interface OpenWeatherMinutely {
  at: number;
  label: string;
  precipitationMm: number;
}

export interface OpenWeatherHourly {
  at: number;
  label: string;
  tempC: number;
  feelsLikeC: number | null;
  popPct: number;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDeg: number | null;
  description: string;
  icon: string;
}

export interface OpenWeatherDaily {
  dagKey: string;
  label: string;
  tempMinC: number;
  tempMaxC: number;
  popPct: number;
  uviMax: number | null;
  windSpeedKmh: number | null;
  windDeg: number | null;
  sunriseAt: string | null;
  sunsetAt: string | null;
  rainMm: number | null;
  snowMm: number | null;
  description: string;
  icon: string;
}

export interface OpenWeatherCurrent {
  description: string;
  icon: string;
  /** OpenWeather condition code (bijv. 800 = helder) */
  weatherId: number;
  tempC: number | null;
  feelsLikeC: number | null;
  cloudsPct: number;
  visibilityKm: number | null;
  humidityPct: number | null;
  dewPointC: number | null;
  pressureHpa: number | null;
  uvi: number | null;
  windSpeedKmh: number | null;
  windDeg: number | null;
  windGustKmh: number | null;
  rainMm1h: number | null;
  snowMm1h: number | null;
}

export interface OpenWeatherAlert {
  event: string;
  senderName: string;
  startAt: string;
  endAt: string;
  description: string;
}

export interface OpenWeatherSupplement {
  current: OpenWeatherCurrent;
  minutely: OpenWeatherMinutely[];
  hourly: OpenWeatherHourly[];
  daily: OpenWeatherDaily[];
  alerts: OpenWeatherAlert[];
  dataSource: "onecall-3" | "2.5";
  updatedAt: string;
}

export interface AstronomieApi {
  period: "night" | "dawn" | "day" | "evening";
  sunriseLabel: string;
  sunsetLabel: string;
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
