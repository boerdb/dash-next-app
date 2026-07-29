import type { CSSProperties } from "react";
import type { WeatherCondition } from "@/lib/api/types";

/** SVG-illustraties per weertype — zie public/weather/ATTRIBUTION.txt */
export const weatherBackgrounds: Record<WeatherCondition, { image: string }> = {
  sunny: { image: "/weather/sunny.svg" },
  "partly-cloudy": { image: "/weather/partly-cloudy.svg" },
  cloudy: { image: "/weather/cloudy.svg" },
  rain: { image: "/weather/rainy.svg" },
  snow: { image: "/weather/snow.svg" },
  thunder: { image: "/weather/thunder.svg" },
  storm: { image: "/weather/thunder.svg" },
  wind: { image: "/weather/cloudy.svg" },
  fog: { image: "/weather/fog.svg" },
  night: { image: "/weather/night.svg" },
  dusk: { image: "/weather/dusk.svg" },
  evening: { image: "/weather/evening.svg" },
  dawn: { image: "/weather/dawn.svg" },
};

export function getWeatherBackgroundStyle(condition: WeatherCondition): CSSProperties {
  const { image } = weatherBackgrounds[condition];
  return {
    backgroundImage: `url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
