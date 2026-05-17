/** Intern — ruwe OpenWeather 2.5 responses (niet naar client). */

export interface OwWeatherResponse {
  weather?: { id?: number; description?: string; icon?: string }[];
  visibility?: number;
  clouds?: { all?: number };
  main?: {
    temp?: number;
    feels_like?: number;
    pressure?: number;
    humidity?: number;
    dew_point?: number;
  };
  wind?: {
    speed?: number;
    deg?: number;
    gust?: number;
  };
}

export interface OwForecastItem {
  dt: number;
  main?: {
    temp?: number;
    temp_min?: number;
    temp_max?: number;
    feels_like?: number;
    pressure?: number;
    humidity?: number;
  };
  pop?: number;
  wind?: { speed?: number; deg?: number; gust?: number };
  weather?: { id?: number; description?: string; icon?: string }[];
}

export interface OwForecastResponse {
  list?: OwForecastItem[];
}

/** Intern — ruwe OpenWeather One Call API 3.0 response (niet naar client). */

export interface OwPrecipVolume {
  "1h"?: number;
}

export interface OwOneCallWeather {
  id?: number;
  description?: string;
  icon?: string;
}

export interface OwOneCallCurrent {
  dt?: number;
  sunrise?: number;
  sunset?: number;
  temp?: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  uvi?: number;
  clouds?: number;
  visibility?: number;
  wind_speed?: number;
  wind_deg?: number;
  wind_gust?: number;
  weather?: OwOneCallWeather[];
  rain?: OwPrecipVolume;
  snow?: OwPrecipVolume;
}

export interface OwOneCallHourly {
  dt: number;
  temp?: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  uvi?: number;
  clouds?: number;
  visibility?: number;
  wind_speed?: number;
  wind_deg?: number;
  wind_gust?: number;
  pop?: number;
  weather?: OwOneCallWeather[];
  rain?: OwPrecipVolume;
  snow?: OwPrecipVolume;
}

export interface OwOneCallDaily {
  dt: number;
  sunrise?: number;
  sunset?: number;
  moonrise?: number;
  moonset?: number;
  temp?: {
    min?: number;
    max?: number;
    day?: number;
    night?: number;
    eve?: number;
    morn?: number;
  };
  feels_like?: {
    day?: number;
    night?: number;
    eve?: number;
    morn?: number;
  };
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  wind_speed?: number;
  wind_deg?: number;
  wind_gust?: number;
  uvi?: number;
  clouds?: number;
  pop?: number;
  weather?: OwOneCallWeather[];
  rain?: number;
  snow?: number;
}

export interface OwOneCallMinutely {
  dt: number;
  precipitation?: number;
}

export interface OwOneCallAlert {
  sender_name?: string;
  event?: string;
  start?: number;
  end?: number;
  description?: string;
  tags?: string[];
}

export interface OwOneCallResponse {
  current?: OwOneCallCurrent;
  minutely?: OwOneCallMinutely[];
  hourly?: OwOneCallHourly[];
  daily?: OwOneCallDaily[];
  alerts?: OwOneCallAlert[];
}
