import type { CSSProperties } from "react";
import type { WeatherCondition } from "@/lib/api/types";

/** Fotorealistische Pexels-hero's per weertype — zie public/weather/ATTRIBUTION.txt */
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
  dusk: { image: "/weather/evening.jpg" },
  evening: { image: "/weather/evening.jpg" },
  dawn: { image: "/weather/dawn.jpg" },
};

export function getWeatherBackgroundStyle(condition: WeatherCondition): CSSProperties {
  const { image } = weatherBackgrounds[condition];
  return {
    backgroundImage: `linear-gradient(180deg, rgba(4,18,34,0.25) 0%, rgba(4,18,34,0.55) 55%, rgba(4,18,34,0.82) 100%), url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
