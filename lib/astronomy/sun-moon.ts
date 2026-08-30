import SunCalc, { type GetTimesResult } from "suncalc";
import { HARLINGEN } from "@/lib/location";

export type DayPeriod = "night" | "dawn" | "day" | "evening";

export interface AstronomyInfo {
  period: DayPeriod;
  sunrise: Date;
  sunset: Date;
  dawn: Date;
  dusk: Date;
  sunriseLabel: string;
  sunsetLabel: string;
  /** Lengte tussen zonopkomst en -ondergang, bijv. "15u 28m" */
  daylightHoursLabel: string;
  sunAltitudeDeg: number;
  /** 0 = sunrise (links), 1 = sunset (rechts) — buiten bereik <0 of >1 */
  sunProgress: number;
  sunBelowHorizon: boolean;
  moon: {
    phase: number;
    fraction: number;
    label: string;
    illuminationPct: number;
    riseLabel: string | null;
    setLabel: string | null;
  };
}

const AMS_TZ = "Europe/Amsterdam";

const AMS_TIME = new Intl.DateTimeFormat("nl-NL", {
  timeZone: AMS_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * 12:00 op de Amsterdamse kalenderdag van `date`.
 * SunCalc.getTimes volgt anders middernacht UTC (in de zomer tot 02:00 nog "gisteren").
 */
export function amsterdamCivilNoon(date: Date): Date {
  const ymd = date.toLocaleDateString("sv-SE", { timeZone: AMS_TZ });
  const asUtc = new Date(`${ymd}T12:00:00Z`);
  const inAms = asUtc
    .toLocaleString("sv-SE", { timeZone: AMS_TZ, hour12: false })
    .replace(" ", "T");
  const offsetMs = asUtc.getTime() - new Date(`${inAms}Z`).getTime();
  return new Date(asUtc.getTime() + offsetMs);
}

function amsterdamClockMinutes(date: Date): number {
  const parts = AMS_TIME.formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function formatTimeNl(date: Date): string {
  return AMS_TIME.format(date);
}

export function formatDaylightDuration(sunrise: Date, sunset: Date): string {
  const startMin = amsterdamClockMinutes(sunrise);
  const endMin = amsterdamClockMinutes(sunset);
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return "—";
  const totalMin = endMin - startMin;
  if (totalMin <= 0) return "—";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} uur`;
  return `${h}u ${m}m`;
}

export function getMoonPhaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "Nieuwe maan";
  if (phase < 0.22) return "Wassende sikkel";
  if (phase < 0.28) return "Eerste kwartier";
  if (phase < 0.47) return "Wassende maan";
  if (phase < 0.53) return "Volle maan";
  if (phase < 0.72) return "Afnemende maan";
  if (phase < 0.78) return "Laatste kwartier";
  return "Afnemende sikkel";
}

export function getDayPeriod(now: Date, times: GetTimesResult): DayPeriod {
  if (now < times.dawn || now >= times.dusk) return "night";
  if (now < times.sunrise) return "dawn";
  if (now < times.sunset) return "day";
  return "evening";
}

export const periodLabels: Record<DayPeriod, string> = {
  night: "Nacht",
  dawn: "Dageraad",
  day: "Dag",
  evening: "Avond",
};

export function toAstronomieApi(info: AstronomyInfo) {
  return {
    period: info.period,
    sunriseLabel: info.sunriseLabel,
    sunsetLabel: info.sunsetLabel,
    daylightHoursLabel: info.daylightHoursLabel,
    sunProgress: info.sunProgress,
    sunBelowHorizon: info.sunBelowHorizon,
    sunAltitudeDeg: info.sunAltitudeDeg,
    moon: info.moon,
  };
}

export function getAstronomyInfo(
  date = new Date(),
  lat = HARLINGEN.latitude,
  lng = HARLINGEN.longitude
): AstronomyInfo {
  const civilNoon = amsterdamCivilNoon(date);
  const times = SunCalc.getTimes(civilNoon, lat, lng);
  const moonTimes = SunCalc.getMoonTimes(civilNoon, lat, lng);
  const sunPos = SunCalc.getPosition(date, lat, lng);
  const moon = SunCalc.getMoonIllumination(date);

  const sunrise = times.sunrise;
  const sunset = times.sunset;
  const dayMs = sunset.getTime() - sunrise.getTime();
  const sunProgress =
    dayMs > 0
      ? (date.getTime() - sunrise.getTime()) / dayMs
      : 0.5;

  const sunAltitudeDeg = (sunPos.altitude * 180) / Math.PI;
  const sunBelowHorizon = sunAltitudeDeg < -0.5;

  return {
    period: getDayPeriod(date, times),
    sunrise,
    sunset,
    dawn: times.dawn,
    dusk: times.dusk,
    sunriseLabel: formatTimeNl(sunrise),
    sunsetLabel: formatTimeNl(sunset),
    daylightHoursLabel: formatDaylightDuration(sunrise, sunset),
    sunAltitudeDeg,
    sunProgress,
    sunBelowHorizon,
    moon: {
      phase: moon.phase,
      fraction: moon.fraction,
      label: getMoonPhaseLabel(moon.phase),
      illuminationPct: Math.round(moon.fraction * 100),
      riseLabel:
        moonTimes.rise && !Number.isNaN(moonTimes.rise.getTime())
          ? formatTimeNl(moonTimes.rise)
          : null,
      setLabel:
        moonTimes.set && !Number.isNaN(moonTimes.set.getTime())
          ? formatTimeNl(moonTimes.set)
          : null,
    },
  };
}
