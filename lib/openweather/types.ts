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

/** Intern — ruwe OpenWeather One Call API 3.0 response (niet naar client). */

export interface OwOneCallWeather {
  id?: number;
  description?: string;
  icon?: string;
}

export interface OwOneCallCurrent {
  dt?: number;
  clouds?: number;
  visibility?: number;
  humidity?: number;
  dew_point?: number;
  weather?: OwOneCallWeather[];
}

export interface OwOneCallHourly {
  dt: number;
  temp?: number;
  pop?: number;
  weather?: OwOneCallWeather[];
}

export interface OwOneCallDaily {
  dt: number;
  temp?: { min?: number; max?: number };
  pop?: number;
  weather?: OwOneCallWeather[];
}

export interface OwOneCallAlert {
  sender_name?: string;
  event?: string;
  start?: number;
  end?: number;
  description?: string;
}

export interface OwOneCallResponse {
  current?: OwOneCallCurrent;
  hourly?: OwOneCallHourly[];
  daily?: OwOneCallDaily[];
  alerts?: OwOneCallAlert[];
}
