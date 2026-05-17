import type { CSSProperties } from "react";
import type { WeatherCondition } from "@/lib/api/types";

/** Foto's: Pexels (gratis te gebruiken) — zie public/weather/ATTRIBUTION.txt */
export const weatherBackgrounds: Record<WeatherCondition, { image: string }> = {
  sunny: { image: "/weather/sunny.jpg" },
  "partly-cloudy": { image: "/weather/partly-cloudy.jpg" },
  cloudy: { image: "/weather/cloudy.jpg" },
  rain: { image: "/weather/rainy.jpg" },
  snow: { image: "/weather/snow.jpg" },
  thunder: { image: "/weather/thunder.jpg" },
  storm: { image: "/weather/storm.jpg" },
  wind: { image: "/weather/wind.jpg" },
  fog: { image: "/weather/fog.jpg" },
  night: { image: "/weather/night.jpg" },
  evening: { image: "/weather/evening.jpg" },
  dawn: { image: "/weather/dawn.jpg" },
};

/** Lichter dan voorheen: midden laat foto-kleur door; onder sluit aan op --background */
const overlay =
  "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.08) 48%, rgba(12,18,34,0.52) 100%)";

const darkConditions = new Set<WeatherCondition>([
  "night",
  "evening",
  "storm",
  "thunder",
  "rain",
  "fog",
]);

const overlayDark =
  "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.15) 45%, rgba(12,18,34,0.58) 100%)";

export function getWeatherBackgroundStyle(condition: WeatherCondition): CSSProperties {
  const { image } = weatherBackgrounds[condition];
  const scrim = darkConditions.has(condition) ? overlayDark : overlay;
  return {
    backgroundImage: `${scrim}, url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
