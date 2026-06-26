import type { WeatherCondition } from "@/lib/api/types";

type ClearSkyCondition = Extract<
  WeatherCondition,
  "sunny" | "partly-cloudy" | "cloudy"
>;

const CLEAR_SKY_RANK: Record<ClearSkyCondition, number> = {
  cloudy: 0,
  "partly-cloudy": 1,
  sunny: 2,
};

/** Kortgolvige instraling (Open-Meteo current); corrigeert te pessimistische bewolking. */
export function conditionFromShortwaveRadiation(wm2: number): ClearSkyCondition {
  if (wm2 > 600) return "sunny";
  if (wm2 > 250) return "partly-cloudy";
  return "cloudy";
}

export function pickSunnierSkyCondition(
  model: ClearSkyCondition,
  radiation: ClearSkyCondition
): ClearSkyCondition {
  return CLEAR_SKY_RANK[radiation] > CLEAR_SKY_RANK[model]
    ? radiation
    : model;
}

/** WMO weather interpretation codes (Open-Meteo). */
export function conditionFromOpenMeteo(
  weatherCode: number,
  cloudCoverPct: number,
  shortwaveRadiationWm2?: number | null
): WeatherCondition {
  if (weatherCode === 45 || weatherCode === 48) return "fog";
  if (weatherCode >= 71 && weatherCode <= 77) return "snow";
  if (weatherCode >= 95 && weatherCode <= 99) {
    return weatherCode >= 96 ? "storm" : "thunder";
  }
  if (weatherCode >= 51 && weatherCode <= 67) return "rain";
  if (weatherCode >= 80 && weatherCode <= 82) return "rain";
  if (weatherCode >= 85 && weatherCode <= 86) return "snow";

  let fromModel: ClearSkyCondition = "cloudy";
  if (weatherCode === 0) fromModel = "sunny";
  else if (weatherCode === 1 || weatherCode === 2) fromModel = "partly-cloudy";
  else if (weatherCode === 3) fromModel = "cloudy";
  else if (cloudCoverPct <= 25) fromModel = "sunny";
  else if (cloudCoverPct <= 65) fromModel = "partly-cloudy";

  if (
    shortwaveRadiationWm2 != null &&
    Number.isFinite(shortwaveRadiationWm2)
  ) {
    return pickSunnierSkyCondition(
      fromModel,
      conditionFromShortwaveRadiation(shortwaveRadiationWm2)
    );
  }

  return fromModel;
}

export function openMeteoImpliesRain(weatherCode: number): boolean {
  return (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  );
}

export function openMeteoImpliesSnow(weatherCode: number): boolean {
  return (
    (weatherCode >= 71 && weatherCode <= 77) ||
    (weatherCode >= 85 && weatherCode <= 86)
  );
}

export function openMeteoImpliesThunder(weatherCode: number): boolean {
  return weatherCode >= 95 && weatherCode <= 99;
}
