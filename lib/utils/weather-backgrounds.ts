import type { CSSProperties } from "react";
import type { WeatherCondition } from "@/lib/api/types";

/** Foto's: Pexels (gratis te gebruiken) — zie public/weather/ATTRIBUTION.txt */
export const weatherBackgrounds: Record<WeatherCondition, { image: string }> = {
  sunny: { image: "/weather/sunny.jpg" },
  "partly-cloudy": { image: "/weather/partly-cloudy.jpg" },
  cloudy: { image: "/weather/cloudy.jpg" },
  rain: { image: "/weather/rainy.jpg" },
  fog: { image: "/weather/fog.jpg" },
  night: { image: "/weather/night.jpg" },
  evening: { image: "/weather/evening.jpg" },
  dawn: { image: "/weather/dawn.jpg" },
};

const overlay =
  "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, rgba(10,10,10,0.75) 100%)";

export function getWeatherBackgroundStyle(condition: WeatherCondition): CSSProperties {
  const { image } = weatherBackgrounds[condition];
  return {
    backgroundImage: `${overlay}, url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
