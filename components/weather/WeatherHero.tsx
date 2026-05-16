"use client";

import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Moon,
  Sun,
  Sunset,
} from "lucide-react";
import type { AstronomieApi, WeerLive, WeatherCondition } from "@/lib/api/types";
import { periodLabels } from "@/lib/astronomy/sun-moon";
import { conditionLabels } from "@/lib/utils/weather-condition";
import { getWeatherBackgroundStyle } from "@/lib/utils/weather-backgrounds";
import { SunMoonArc } from "@/components/weather/SunMoonArc";
import { cn } from "@/lib/utils";

const icons: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  fog: CloudFog,
  night: Moon,
  evening: Sunset,
  dawn: Sun,
};

interface WeatherHeroProps {
  data: WeerLive;
  condition: WeatherCondition;
  astro: AstronomieApi;
  updateLabel?: string;
}

export function WeatherHero({
  data,
  condition,
  astro,
  updateLabel,
}: WeatherHeroProps) {
  const Icon = icons[condition];
  const temp = data.temp_c != null ? Number(data.temp_c).toFixed(1) : "—";
  const periodLabel = periodLabels[astro.period];
  const weatherLabel = conditionLabels[condition];
  const showWeatherSub =
    weatherLabel !== periodLabel &&
    !(astro.period === "day" && ["Bewolkt", "Deels bewolkt", "Zonnig"].includes(weatherLabel));

  return (
    <section
      className="relative -mx-4 overflow-hidden rounded-b-3xl px-4 pb-8 pt-6 sm:-mx-6"
      style={getWeatherBackgroundStyle(condition)}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0a0a0a]/90" />
      <div className="relative z-10 text-center">
        {updateLabel && (
          <p className="mb-2 text-xs text-white/70">{updateLabel}</p>
        )}

        <p className="text-xs font-semibold uppercase tracking-widest text-white">
          {periodLabel}
        </p>
        {showWeatherSub && (
          <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-white/65">
            {weatherLabel}
          </p>
        )}

        <Icon
          className={cn(
            "mx-auto my-2 h-10 w-10 text-white/90 drop-shadow-lg",
            condition === "sunny" && "text-amber-200",
            condition === "evening" && "text-orange-200"
          )}
          strokeWidth={1.5}
        />

        <SunMoonArc astro={astro} />

        <p className="mt-3 text-sm uppercase tracking-wide text-white/80">Buiten</p>
        <h1 className="text-6xl font-bold tabular-nums text-white drop-shadow-md">
          {temp}
          <sup className="ml-1 text-2xl font-normal text-white/80">°C</sup>
        </h1>
        <p className="mt-1 text-lg text-sky-200">
          Gevoel: {data.gevoelstemperatuur ?? "—"} °C
        </p>
        <p className="mt-2 text-sm text-white/90">
          Min: {data.temp_min_c}°C · Max: {data.temp_max_c}°C
        </p>
        <p className="text-sm text-white/80">
          Vocht: {data.humidity}% · Dauwpunt: {data.dauwpunt} °C
        </p>
      </div>
    </section>
  );
}
