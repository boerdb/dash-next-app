import { getAstronomyInfo, type DayPeriod } from "@/lib/astronomy/sun-moon";

export type ThemeMode = "day" | "night";

const THEME_COLORS: Record<ThemeMode, string> = {
  day: "#dfe4ec",
  night: "#0b1220",
};

export function getThemeModeFromPeriod(period: DayPeriod): ThemeMode {
  return period === "night" ? "night" : "day";
}

export function getCurrentThemeMode(date = new Date()): ThemeMode {
  return getThemeModeFromPeriod(getAstronomyInfo(date).period);
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode === "night" ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[mode]);
  }
}

export function getNextThemeTransition(date = new Date()): Date {
  const info = getAstronomyInfo(date);
  const now = date.getTime();
  const candidates = [info.dawn, info.sunrise, info.sunset, info.dusk]
    .map((d) => d.getTime())
    .filter((t) => t > now)
    .sort((a, b) => a - b);
  if (candidates.length > 0) {
    return new Date(candidates[0]!);
  }
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  return tomorrow;
}

/** Inline boot script — approximate Amsterdam hour, corrected on hydration. */
export const themeBootScript = `(function(){try{var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',hour:'numeric',hour12:false}).formatToParts(new Date());var h=+p.find(function(x){return x.type==='hour';}).value;var m=h>=6&&h<22?'day':'night';document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m==='night'?'dark':'light';}catch(e){document.documentElement.dataset.theme='day';}})()`;
