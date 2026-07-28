"use client";

import { useEffect, useState } from "react";

export interface ChartTheme {
  grid: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipLabel: string;
  cursor: string;
  refLine: string;
  weather: string;
  weatherLight: string;
  energy: string;
  energyLight: string;
  battery: string;
  net: string;
  export: string;
  solar: string;
  temperature: string;
  rain: string;
  rainLight: string;
  lightning: string;
  lightningLight: string;
}

const FALLBACK: ChartTheme = {
  grid: "rgba(255,255,255,0.06)",
  tick: "#94a3b8",
  tooltipBg: "#1e293b",
  tooltipBorder: "#334155",
  tooltipLabel: "#94a3b8",
  cursor: "rgba(255,255,255,0.06)",
  refLine: "rgba(255,255,255,0.15)",
  weather: "#38bdf8",
  weatherLight: "#7dd3fc",
  energy: "#fbbf24",
  energyLight: "#fde68a",
  battery: "#a78bfa",
  net: "#818cf8",
  export: "#eab308",
  solar: "#facc15",
  temperature: "#38bdf8",
  rain: "#38bdf8",
  rainLight: "#7dd3fc",
  lightning: "#fbbf24",
  lightningLight: "#fde68a",
};

function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    grid: get("--chart-grid", FALLBACK.grid),
    tick: get("--chart-tick", FALLBACK.tick),
    tooltipBg: get("--chart-tooltip-bg", FALLBACK.tooltipBg),
    tooltipBorder: get("--chart-tooltip-border", FALLBACK.tooltipBorder),
    tooltipLabel: get("--chart-tooltip-label", FALLBACK.tooltipLabel),
    cursor: get("--chart-cursor", FALLBACK.cursor),
    refLine: get("--chart-ref-line", FALLBACK.refLine),
    weather: get("--chart-weather", FALLBACK.weather),
    weatherLight: get("--chart-weather-light", FALLBACK.weatherLight),
    energy: get("--chart-energy", FALLBACK.energy),
    energyLight: get("--chart-energy-light", FALLBACK.energyLight),
    battery: get("--chart-battery", FALLBACK.battery),
    net: get("--chart-net", FALLBACK.net),
    export: get("--chart-export", FALLBACK.export),
    solar: get("--chart-solar", FALLBACK.solar),
    temperature: get("--chart-temperature", FALLBACK.temperature),
    rain: get("--chart-rain", FALLBACK.rain),
    rainLight: get("--chart-rain-light", FALLBACK.rainLight),
    lightning: get("--chart-lightning", FALLBACK.lightning),
    lightningLight: get("--chart-lightning-light", FALLBACK.lightningLight),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(FALLBACK);

  useEffect(() => {
    const update = () => setTheme(readChartTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function chartTooltipStyle(theme: ChartTheme) {
  return {
    background: theme.tooltipBg,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: 8,
  } as const;
}
