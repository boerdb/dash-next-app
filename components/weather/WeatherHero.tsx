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
import { SunMoonArc } from "@/components/weather/SunMoonArc";
import { DegreeMark } from "@/components/ui/degree-mark";
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
  const showWeatherSub =
    weatherLabel !== periodLabel &&
    !(astro.period === "day" && ["Bewolkt", "Deels bewolkt", "Zonnig"].includes(weatherLabel));

  return (
    <section
      className="relative -mx-4 min-h-[22rem] overflow-hidden rounded-b-[var(--radius-lg)] px-4 pb-8 pt-6 sm:-mx-6 sm:min-h-[24rem] lg:mx-0 lg:min-h-[26rem] lg:rounded-[var(--radius-lg)] lg:px-6 lg:pb-10 lg:pt-8"
      style={getWeatherBackgroundStyle(condition)}
    >
      <div className="relative z-10 flex h-full min-h-[20rem] flex-col justify-end text-center [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] sm:min-h-[22rem] lg:min-h-[24rem] lg:text-left">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/90 lg:justify-start">
            {updateLabel ? <span>{updateLabel}</span> : null}
            {updateLabel ? <span className="hidden text-white/50 sm:inline">·</span> : null}
            <span className="text-label font-semibold uppercase tracking-wide text-white">
              {periodLabel}
            </span>
            {showWeatherSub ? (
              <>
                <span className="text-white/50">·</span>
                <span className="text-label font-medium uppercase text-white/90">
                  {weatherLabel}
                </span>
              </>
            ) : null}
          </div>

          <Icon
            className={cn(
              "mx-auto h-10 w-10 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] lg:mx-0",
              condition === "sunny" && "text-accent-amber",
              (condition === "evening" || condition === "dusk") && "text-orange-300",
              condition === "night" && "text-accent-amber"
            )}
            strokeWidth={1.5}
          />

          <SunMoonArc astro={astro} />

          <p className="text-caption mt-3 uppercase tracking-label text-white/80">
            Buitentemperatuur
          </p>
          <h1 className="text-metric-lg text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)]">
            {temp}
            <DegreeMark mode="sup" className="text-white/90">
              °C
            </DegreeMark>
          </h1>
      </div>
    </section>
  );
}
