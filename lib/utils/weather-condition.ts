import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenMeteoSky, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenMeteo,
  conditionFromShortwaveRadiation,
  isClearSkyCondition,
  openMeteoImpliesFog,
  openMeteoImpliesRain,
  openMeteoImpliesSnow,
  openMeteoImpliesThunder,
  pickSunnierSkyCondition,
} from "@/lib/open-meteo/condition";
import { isRecentLightningStrikeNearby } from "@/lib/weer/lightning-storm";
import { resolveRainRateMm } from "@/lib/weer/ws90-rain";

/** Lokale instraling mag het model alleen ophelderen (schaduw op sensor ≠ bewolkt). */
function blendWithLocalSolar(
  meteoCondition: WeatherCondition,
  solarWm2: number
): WeatherCondition {
  if (!isClearSkyCondition(meteoCondition)) return meteoCondition;
  const local = conditionFromShortwaveRadiation(solarWm2);
  return pickSunnierSkyCondition(meteoCondition, local);
}

/**
 * Lokale mist-hero: vochtig én windstil is niet genoeg. Open-Meteo moet mist
 * bevestigen (WMO 45/48). Zonder luchtdata blijft de stationheuristiek.
 */
function isStationFoggy(
  data: WeerLive,
  openMeteoSky?: OpenMeteoSky | null
): boolean {
  const humidity = Number(data.humidity) || 0;
  const wind = Number(data.windspd_avg10m_kmh) || 0;
  if (humidity < 95 || wind >= 5) return false;
  if (!openMeteoSky) return true;
  return openMeteoImpliesFog(openMeteoSky.weatherCode);
}

function isStationWindy(data: WeerLive): boolean {
  const wind = Number(data.windspd_avg10m_kmh) || 0;
  const gust = Number(data.windgust_kmh) || 0;
  return wind >= 40 || gust >= 55;
}

/**
 * Onweer-hero alleen bij échte WH57-activiteit: een recente inslag of de
 * gelatchte stormkans (die nu uitsluitend door echte activiteit wordt gezet).
 * De onweersgevoelige-lucht-heuristiek zet de hero bewust NIET op onweer.
 */
function isStationThunder(data: WeerLive): boolean {
  if (isRecentLightningStrikeNearby(data)) return true;
  return data.lightning_storm_risk === true;
}

/**
 * Externe bevestiging van actueel onweer: Open-Meteo weercode 95-99 (nowcast)
 * of een actieve KNMI-onweerwaarschuwing. Geeft "storm" bij hagel (≥96).
 */
function externalThunderCondition(
  openMeteoSky: OpenMeteoSky | null | undefined,
  knmiThunder: boolean
): WeatherCondition | null {
  if (openMeteoSky && openMeteoImpliesThunder(openMeteoSky.weatherCode)) {
    return openMeteoSky.weatherCode >= 96 ? "storm" : "thunder";
  }
  if (knmiThunder) return "thunder";
  return null;
}

function isStationRainy(data: WeerLive): boolean {
  const rate = resolveRainRateMm(data) ?? 0;
  return rate > 0;
}

/** Station meldt expliciet 0 mm/u — dan heeft live-data voorrang boven Open-Meteo-regen. */
function isStationDry(data: WeerLive): boolean {
  const rate = resolveRainRateMm(data);
  if (rate === undefined) return false;
  return rate <= 0;
}

/**
 * 's Nachts zegt instraling niets (0 W/m²). Alleen weercode en bewolking
 * bepalen of de hero helder, deels bewolkt of dicht bewolkt is.
 */
function nightConditionFromSky(
  sky: OpenMeteoSky | null | undefined
): WeatherCondition {
  if (!sky) return "night";
  const skyCondition = conditionFromOpenMeteo(
    sky.weatherCode,
    sky.cloudCoverPct,
    null,
    true
  );
  if (skyCondition === "partly-cloudy") return "night-partly-cloudy";
  if (skyCondition === "cloudy") return "night-cloudy";
  if (skyCondition === "fog") return "fog";
  return "night";
}

function skyFromOpenMeteo(sky: OpenMeteoSky, ignorePrecipitation = false): WeatherCondition {
  const code = sky.weatherCode;
  if (openMeteoImpliesThunder(code)) {
    return code >= 96 ? "storm" : "thunder";
  }
  if (!ignorePrecipitation) {
    if (openMeteoImpliesSnow(code)) return "snow";
    if (openMeteoImpliesRain(code) || sky.precipitationMm > 0) return "rain";
  }
  if (openMeteoImpliesFog(code)) return "fog";
  return conditionFromOpenMeteo(
    code,
    sky.cloudCoverPct,
    sky.shortwaveRadiationWm2,
    ignorePrecipitation
  );
}

export function getWeatherCondition(
  data: WeerLive | null,
  period: DayPeriod = "day",
  sunBelowHorizon = false,
  openMeteoSky?: OpenMeteoSky | null,
  knmiThunder = false
): WeatherCondition {
  const external = externalThunderCondition(openMeteoSky, knmiThunder);
  if (!data) {
    if (external) return external;
    return period === "night" ? nightConditionFromSky(openMeteoSky) : "cloudy";
  }

  if (isStationThunder(data)) return external ?? "thunder";
  if (external) return external;
  if (isStationRainy(data)) return "rain";
  if (isStationFoggy(data, openMeteoSky)) return "fog";
  if (isStationWindy(data)) return "wind";

  if (period === "night") {
    return nightConditionFromSky(openMeteoSky);
  }
  if (period === "evening") return "dusk";
  if (period === "dawn") return "dawn";

  const stationSolar = Number(data.solarradiation);
  const stationDry = isStationDry(data);

  if (openMeteoSky) {
    const meteo = skyFromOpenMeteo(openMeteoSky, stationDry);
    if (Number.isFinite(stationSolar) && stationSolar >= 0) {
      return blendWithLocalSolar(meteo, stationSolar);
    }
    return meteo;
  }

  if (Number.isFinite(stationSolar) && stationSolar >= 0) {
    return conditionFromShortwaveRadiation(stationSolar);
  }

  return "cloudy";
}

export const conditionLabels: Record<WeatherCondition, string> = {
  rain: "Regen",
  snow: "Sneeuw",
  thunder: "Onweer",
  storm: "Storm",
  wind: "Wind",
  fog: "Mist",
  night: "Nacht",
  "night-partly-cloudy": "Deels bewolkt",
  "night-cloudy": "Bewolkt",
  dusk: "Schemering",
  evening: "Avond",
  dawn: "Dageraad",
  sunny: "Zonnig",
  "partly-cloudy": "Deels bewolkt",
  cloudy: "Bewolkt",
};
