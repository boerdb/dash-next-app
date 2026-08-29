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

  const statusLine = (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/90 md:justify-end">
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
  );

  const weatherIcon = (
    <Icon
      className={cn(
        "h-10 w-10 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
        condition === "sunny" && "text-accent-amber",
        (condition === "evening" || condition === "dusk") && "text-orange-300",
        condition === "night" && "text-accent-amber"
      )}
      strokeWidth={1.5}
    />
  );

  const temperature = (
    <div>
      <p className="text-caption uppercase tracking-label text-white/80">
        Buitentemperatuur
      </p>
      <h1 className="text-metric-lg text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)]">
        {temp}
        <DegreeMark mode="sup" className="text-white/90">
          °C
        </DegreeMark>
      </h1>
    </div>
  );

  return (
    <section
      className="relative -mx-4 min-h-[22rem] overflow-hidden rounded-b-[var(--radius-lg)] px-4 pb-8 pt-6 sm:-mx-6 sm:min-h-[24rem] md:min-h-[26rem] lg:mx-0 lg:rounded-[var(--radius-lg)] lg:px-6 lg:pb-10 lg:pt-8"
      style={getWeatherBackgroundStyle(condition)}
    >
      {/* Telefoon: alles gecentreerd */}
      <div className="relative z-10 flex min-h-[20rem] flex-col items-center justify-end text-center [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] sm:min-h-[22rem] md:hidden">
        <div className="mb-3">{statusLine}</div>
        <div className="mb-1">{weatherIcon}</div>
        <SunMoonArc astro={astro} />
        <div className="mt-3">{temperature}</div>
      </div>

      {/* Tablet+: zon/maan in het midden, status + icoon + temp rechts */}
      <div className="relative z-10 hidden min-h-[24rem] [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-8 lg:min-h-[24rem]">
        <div className="flex flex-col items-center justify-end pb-1">
          <SunMoonArc astro={astro} />
        </div>
        <div className="flex flex-col items-end gap-3 self-stretch justify-between py-1 text-right">
          <div className="space-y-2">
            {statusLine}
            <div className="flex justify-end">{weatherIcon}</div>
          </div>
          {temperature}
        </div>
      </div>
    </section>
  );
}
