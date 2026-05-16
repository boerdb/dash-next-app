import type {
  OpenWeatherDaily,
  OpenWeatherHourly,
  OpenWeatherSupplement,
} from "@/lib/api/types";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "@/lib/tides/day-label";
import type { OwForecastItem, OwForecastResponse, OwWeatherResponse } from "./types";

const TZ = "Europe/Amsterdam";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function iconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export function mapOpenWeatherSupplement(
  current: OwWeatherResponse,
  forecast: OwForecastResponse
): OpenWeatherSupplement {
  const now = Date.now();
  const list = forecast.list ?? [];

  const hourly: OpenWeatherHourly[] = list
    .filter((item) => item.dt * 1000 > now - 60_000)
    .slice(0, 8)
    .map((item) => toHourly(item));

  const daily = groupDaily(list);

  const w = current.weather?.[0];
  const visibilityM = current.visibility;
  const dew = current.main?.dew_point;

  return {
    current: {
      description: w?.description ?? "—",
      icon: w?.icon ? iconUrl(w.icon) : "",
      weatherId: w?.id ?? 0,
      cloudsPct: current.clouds?.all ?? 0,
      visibilityKm:
        visibilityM != null ? Math.round((visibilityM / 1000) * 10) / 10 : null,
      humidityPct: current.main?.humidity ?? 0,
      dewPointC: dew != null ? Math.round(dew * 10) / 10 : null,
    },
    hourly,
    daily,
    updatedAt: new Date().toISOString(),
  };
}

function toHourly(item: OwForecastItem): OpenWeatherHourly {
  const date = new Date(item.dt * 1000);
  const w = item.weather?.[0];
  return {
    at: item.dt * 1000,
    label: formatTime(date),
    tempC: Math.round((item.main?.temp ?? 0) * 10) / 10,
    popPct: Math.round((item.pop ?? 0) * 100),
    description: w?.description ?? "",
    icon: w?.icon ? iconUrl(w.icon) : "",
  };
}

function groupDaily(list: OwForecastItem[]): OpenWeatherDaily[] {
  const byDay = new Map<
    string,
    {
      temps: number[];
      pops: number[];
      icon: string;
      description: string;
      date: Date;
    }
  >();

  for (const item of list) {
    const date = new Date(item.dt * 1000);
    const key = dagKeyAmsterdam(date);
    const temp = item.main?.temp ?? 0;
    const pop = Math.round((item.pop ?? 0) * 100);
    const w = item.weather?.[0];
    const existing = byDay.get(key);

    if (!existing) {
      byDay.set(key, {
        temps: [temp],
        pops: [pop],
        icon: w?.icon ?? "01d",
        description: w?.description ?? "",
        date,
      });
    } else {
      existing.temps.push(temp);
      existing.pops.push(pop);
      if (pop >= Math.max(...existing.pops)) {
        existing.icon = w?.icon ?? existing.icon;
        existing.description = w?.description ?? existing.description;
      }
    }
  }

  const today = dagKeyAmsterdam(new Date());
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5)
    .map(([dagKey, g]) => ({
      dagKey,
      label: dagKey === today ? "Vandaag" : dagLabelAmsterdam(g.date),
      tempMinC: Math.round(Math.min(...g.temps) * 10) / 10,
      tempMaxC: Math.round(Math.max(...g.temps) * 10) / 10,
      popPct: Math.max(...g.pops),
      description: g.description,
      icon: iconUrl(g.icon),
    }));
}
