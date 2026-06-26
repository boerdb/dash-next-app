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
import { isWh57Detected } from "@/lib/weer/sensor-status";
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
  const wh57Detected = isWh57Detected(data);
  const showWeatherSub =
    weatherLabel !== periodLabel &&
    !(astro.period === "day" && ["Bewolkt", "Deels bewolkt", "Zonnig"].includes(weatherLabel));

  return (
    <section
      className="relative -mx-4 overflow-hidden rounded-b-3xl px-4 pb-6 pt-5 sm:-mx-6 md:-mx-8"
      style={getWeatherBackgroundStyle(condition)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background sm:h-20" />
      </div>
      <div className="relative z-10 text-center [text-shadow:0_1px_10px_rgba(0,0,0,0.75)]">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/75">
          {updateLabel ? <span>{updateLabel}</span> : null}
          {updateLabel ? <span className="hidden text-white/40 sm:inline">·</span> : null}
          <span className="font-medium uppercase tracking-widest text-white/90">
            {periodLabel}
          </span>
          {showWeatherSub ? (
            <>
              <span className="text-white/40">·</span>
              <span className="uppercase tracking-wide text-white/70">{weatherLabel}</span>
            </>
          ) : null}
          {wh57Detected ? (
            <>
              <span className="text-white/40">·</span>
              <span className="uppercase tracking-wide text-emerald-200/90">WH57</span>
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

        <p className="mt-2 text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
          Buitentemperatuur
        </p>
        <h1 className="text-6xl font-bold tabular-nums leading-none text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          {temp}
          <sup className="ml-1 text-2xl font-normal text-white/75">°C</sup>
        </h1>

        <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/90 backdrop-blur-sm">
          <span>
            Gevoel{" "}
            <strong className="font-semibold tabular-nums text-white">
              {data.gevoelstemperatuur ?? "—"}°
            </strong>
          </span>
          {data.hitte_index_c != null ? (
            <>
              <span className="hidden text-white/30 sm:inline">|</span>
              <span>
                Hitte{" "}
                <strong className="font-semibold tabular-nums text-orange-300">
                  {data.hitte_index_c}°
                </strong>
              </span>
            </>
          ) : null}
          <span className="hidden text-white/30 sm:inline">|</span>
          <span>
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
          </span>
        </div>
      </div>
    </section>
  );
}
