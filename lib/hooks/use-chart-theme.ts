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

function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") {
    return readChartThemeFromElement(null);
  }
  return readChartThemeFromElement(document.documentElement);
}

function readChartThemeFromElement(el: HTMLElement | null): ChartTheme {
  const style = el ? getComputedStyle(el) : null;
  const get = (name: string) => style?.getPropertyValue(name).trim() ?? "";
  return {
    grid: get("--chart-grid"),
    tick: get("--chart-tick"),
    tooltipBg: get("--chart-tooltip-bg"),
    tooltipBorder: get("--chart-tooltip-border"),
    tooltipLabel: get("--chart-tooltip-label"),
    cursor: get("--chart-cursor"),
    refLine: get("--chart-ref-line"),
    weather: get("--chart-weather"),
    weatherLight: get("--chart-weather-light"),
    energy: get("--chart-energy"),
    energyLight: get("--chart-energy-light"),
    battery: get("--chart-battery"),
    net: get("--chart-net"),
    export: get("--chart-export"),
    solar: get("--chart-solar"),
    temperature: get("--chart-temperature"),
    rain: get("--chart-rain"),
    rainLight: get("--chart-rain-light"),
    lightning: get("--chart-lightning"),
    lightningLight: get("--chart-lightning-light"),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => readChartTheme());

  useEffect(() => {
    const update = () => setTheme(readChartTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
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
