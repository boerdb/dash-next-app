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
}

const FALLBACK: ChartTheme = {
  grid: "rgba(255,255,255,0.05)",
  tick: "#a1a1aa",
  tooltipBg: "#1e1e1e",
  tooltipBorder: "rgba(255,255,255,0.1)",
  tooltipLabel: "#a1a1aa",
  cursor: "rgba(255,255,255,0.06)",
  refLine: "rgba(255,255,255,0.2)",
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
