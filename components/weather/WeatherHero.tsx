"use client";

import {
  Cloud,
  CloudFog,
  CloudMoon,
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
  "night-fog": CloudFog,
  night: Moon,
  "night-partly-cloudy": CloudMoon,
  "night-cloudy": Cloud,
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

function formatTemp(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : null;
}

export function WeatherHero({
  data,
  condition,
  astro,
  updateLabel,
}: WeatherHeroProps) {
  const Icon = icons[condition];
  const temp = formatTemp(data.temp_c) ?? "—";
  const min = formatTemp(data.temp_min_c);
  const max = formatTemp(data.temp_max_c);
  const periodLabel = periodLabels[astro.period];
  const weatherLabel = conditionLabels[condition];

  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] text-hero-foreground shadow-[var(--elevation-shadow)]"
      style={getWeatherBackgroundStyle(condition)}
    >
      <div className="relative z-10 flex min-h-[21rem] flex-col justify-between p-5 [text-shadow:0_1px_10px_rgba(0,0,0,0.45)] sm:min-h-[23rem] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/25 py-1.5 pl-2 pr-3 text-sm font-semibold backdrop-blur-md [text-shadow:none]">
            <Icon
              className={cn(
                "h-5 w-5",
                (condition === "sunny" || condition === "night" || condition === "night-partly-cloudy") &&
                  "text-[#ffd43b]",
                (condition === "evening" || condition === "dusk") && "text-[#ffa94d]"
              )}
              strokeWidth={2}
            />
            {weatherLabel}
          </span>
          <div className="text-right text-xs font-medium text-hero-muted">
            <p className="text-hero-foreground">{periodLabel}</p>
            {updateLabel ? <p className="mt-0.5">{updateLabel}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="text-sm font-medium text-hero-muted">Buiten</p>
            <h1 className="text-[4.75rem] font-bold leading-[0.9] tracking-[-0.05em] tabular-nums sm:text-[5.5rem]">
              {temp}
              <DegreeMark mode="sup" className="align-top text-3xl text-hero-muted">
                °C
              </DegreeMark>
            </h1>
            {min && max ? (
              <p className="mt-2 text-sm font-semibold tabular-nums">
                <span className="text-hero-muted">Vandaag</span> ↓ {min}° · ↑ {max}°
              </p>
            ) : null}
          </div>
          <div className="w-full sm:w-auto sm:min-w-[17rem]">
            <SunMoonArc astro={astro} />
          </div>
        </div>
      </div>
    </section>
  );
}
