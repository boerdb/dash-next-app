"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Sunset,
  Wind,
} from "lucide-react";
import type { AstronomieApi, WeerLive, WeatherCondition } from "@/lib/api/types";
import { periodLabels } from "@/lib/astronomy/sun-moon";
import { conditionLabels } from "@/lib/utils/weather-condition";
import { getWeatherBackgroundStyle } from "@/lib/utils/weather-backgrounds";
import { shouldShowHeatIndex } from "@/lib/weer/heat-index";
import { shouldShowWindChill } from "@/lib/weer/wind-chill-display";
import { SunMoonArc } from "@/components/weather/SunMoonArc";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

const icons: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
  storm: CloudLightning,
  wind: Wind,
  fog: CloudFog,
  night: Moon,
  dusk: Sunset,
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
  const showHitteIndex = shouldShowHeatIndex(data);
  const showWindChill = shouldShowWindChill(data);
  const showWeatherSub =
    weatherLabel !== periodLabel &&
    !(astro.period === "day" && ["Bewolkt", "Deels bewolkt", "Zonnig"].includes(weatherLabel));

  return (
    <div className="lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
      <section
        className="relative -mx-4 overflow-hidden rounded-b-[var(--radius-lg)] px-4 pb-6 pt-5 sm:-mx-6 lg:mx-0 lg:rounded-[var(--radius-lg)] lg:px-6"
        style={getWeatherBackgroundStyle(condition)}
      >
        <div className="relative z-10 text-center [text-shadow:0_1px_10px_rgba(0,0,0,0.65)] lg:text-left">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/85 lg:justify-start">
            {updateLabel ? <span>{updateLabel}</span> : null}
            {updateLabel ? <span className="hidden text-white/50 sm:inline">·</span> : null}
            <span className="text-label font-semibold uppercase tracking-wide text-white">
              {periodLabel}
            </span>
            {showWeatherSub ? (
              <>
                <span className="text-white/50">·</span>
                <span className="text-label font-medium uppercase text-white/85">
                  {weatherLabel}
                </span>
              </>
            ) : null}
          </div>

          <Icon
            className={cn(
              "mx-auto h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] lg:mx-0",
              condition === "sunny" && "text-amber-300",
              (condition === "evening" || condition === "dusk") && "text-orange-300",
              condition === "night" && "text-amber-200"
            )}
            strokeWidth={1.5}
          />

          <SunMoonArc astro={astro} />

          <p className="text-caption mt-2 uppercase tracking-label text-white/75">
            Buitentemperatuur
          </p>
          <h1 className="text-metric-lg text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            {temp}
            <sup className="ml-1 text-2xl font-normal text-white/85">°C</sup>
          </h1>
        </div>
      </section>

      <Surface level="raised" className="mt-4 lg:mt-0">
        <SurfaceBody className="space-y-3">
          {showWindChill ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-label text-surface-muted">Gevoel</span>
              <span className="text-metric text-accent-weather">{data.gevoelstemperatuur}°</span>
            </div>
          ) : null}
          {showHitteIndex ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-label text-surface-muted">Hitte-index</span>
              <span className="text-metric text-accent-energy">{data.hitte_index_c}°</span>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-surface-muted">
              {data.temp_min_time ? `${data.temp_min_time} min` : "Min"}
            </span>
            <span className="text-metric text-accent-weather">{data.temp_min_c}°</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-surface-muted">
              {data.temp_max_time ? `${data.temp_max_time} max` : "Max"}
            </span>
            <span className="text-metric text-accent-energy">{data.temp_max_c}°</span>
          </div>
        </SurfaceBody>
      </Surface>
    </div>
  );
}
