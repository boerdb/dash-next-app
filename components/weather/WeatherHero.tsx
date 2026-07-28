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
    <section
      className="relative -mx-4 overflow-hidden rounded-b-3xl px-4 pb-6 pt-5 sm:-mx-6 md:-mx-8"
      style={getWeatherBackgroundStyle(condition)}
    >
      <div className="relative z-10 text-center [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/75">
          {updateLabel ? <span>{updateLabel}</span> : null}
          {updateLabel ? <span className="hidden text-white/40 sm:inline">·</span> : null}
          <span className="text-label font-medium uppercase text-white/90">
            {periodLabel}
          </span>
          {showWeatherSub ? (
            <>
              <span className="text-white/40">·</span>
              <span className="text-label uppercase text-white/70">{weatherLabel}</span>
            </>
          ) : null}
        </div>

        <Icon
          className={cn(
            "mx-auto h-9 w-9 text-white/90 drop-shadow-lg",
            condition === "sunny" && "text-amber-200",
            condition === "evening" && "text-orange-200",
            (condition === "thunder" || condition === "storm") && "text-violet-200",
            condition === "snow" && "text-sky-200",
            condition === "wind" && "text-teal-200"
          )}
          strokeWidth={1.5}
        />

        <SunMoonArc astro={astro} />

        <p className="text-caption mt-2 uppercase tracking-label text-white/60">
          Buitentemperatuur
        </p>
        <h1 className="text-6xl font-bold tabular-nums leading-none text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          {temp}
          <sup className="ml-1 text-2xl font-normal text-white/75">°C</sup>
        </h1>

        <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/95 backdrop-blur-sm">
          {showWindChill ? (
            <span>
              Gevoel{" "}
              <strong className="font-semibold tabular-nums text-sky-200">
                {data.gevoelstemperatuur}°
              </strong>
            </span>
          ) : null}
          {showHitteIndex ? (
            <>
              {showWindChill ? (
                <span className="hidden text-white/30 sm:inline">|</span>
              ) : null}
              <span>
                Hitte-index{" "}
                <strong className="font-semibold tabular-nums text-orange-300">
                  {data.hitte_index_c}°
                </strong>
              </span>
            </>
          ) : null}
          {(showWindChill || showHitteIndex) ? (
            <span className="hidden text-white/30 sm:inline">|</span>
          ) : null}
          <span>
            {data.temp_min_time ? (
              <span className="text-caption mr-1 tabular-nums text-white/55">
                {data.temp_min_time}
              </span>
            ) : null}
            Min{" "}
            <strong className="font-semibold tabular-nums text-sky-200">
              {data.temp_min_c}°
            </strong>
          </span>
          <span className="hidden text-white/30 sm:inline">|</span>
          <span>
            Max{" "}
            <strong className="font-semibold tabular-nums text-orange-200">
              {data.temp_max_c}°
            </strong>
            {data.temp_max_time ? (
              <span className="text-caption ml-1 tabular-nums text-white/55">
                {data.temp_max_time}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </section>
  );
}
