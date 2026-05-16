/** Intern — ruwe OpenWeather 2.5 responses (niet naar client). */

export interface OwWeatherResponse {
  weather?: { id?: number; description?: string; icon?: string }[];
  visibility?: number;
  clouds?: { all?: number };
  main?: {
    humidity?: number;
    dew_point?: number;
  };
}

export interface OwForecastItem {
  dt: number;
  main?: {
    temp?: number;
    temp_min?: number;
    temp_max?: number;
  };
  pop?: number;
  weather?: { id?: number; description?: string; icon?: string }[];
}

export interface OwForecastResponse {
  list?: OwForecastItem[];
}
