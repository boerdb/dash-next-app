import type {
  OpenWeatherAlert,
  OpenWeatherDaily,
  OpenWeatherHourly,
  OpenWeatherSupplement,
} from "@/lib/api/types";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "@/lib/tides/day-label";
import type {
  OwForecastItem,
  OwForecastResponse,
  OwOneCallAlert,
  OwOneCallDaily,
  OwOneCallHourly,
  OwOneCallResponse,
  OwWeatherResponse,
} from "./types";

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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatAlertTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function mapOneCall3(data: OwOneCallResponse): OpenWeatherSupplement {
  const now = Date.now();
  const current = data.current;
  const w = current?.weather?.[0];
  const visibilityM = current?.visibility;

  const hourly: OpenWeatherHourly[] = (data.hourly ?? [])
    .filter((item) => item.dt * 1000 > now - 60_000)
    .slice(0, 8)
    .map((item) => toOneCallHourly(item));

  const today = dagKeyAmsterdam(new Date());
  const daily: OpenWeatherDaily[] = (data.daily ?? []).slice(0, 5).map((item) => {
    const date = new Date(item.dt * 1000);
    const dagKey = dagKeyAmsterdam(date);
    const weather = item.weather?.[0];
    return {
      dagKey,
      label: dagKey === today ? "Vandaag" : dagLabelAmsterdam(date),
      tempMinC: round1(item.temp?.min ?? 0),
      tempMaxC: round1(item.temp?.max ?? 0),
      popPct: Math.round((item.pop ?? 0) * 100),
      description: weather?.description ?? "",
      icon: weather?.icon ? iconUrl(weather.icon) : "",
    };
  });

  const alerts: OpenWeatherAlert[] = (data.alerts ?? []).map(mapAlert);

  return {
    current: {
      description: w?.description ?? "—",
      icon: w?.icon ? iconUrl(w.icon) : "",
      weatherId: w?.id ?? 0,
      cloudsPct: current?.clouds ?? 0,
      visibilityKm:
        visibilityM != null ? round1(visibilityM / 1000) : null,
      humidityPct: current?.humidity ?? 0,
      dewPointC:
        current?.dew_point != null ? round1(current.dew_point) : null,
    },
    hourly,
    daily,
    alerts,
    dataSource: "onecall-3",
    updatedAt: new Date().toISOString(),
  };
}

function toOneCallHourly(item: OwOneCallHourly): OpenWeatherHourly {
  const date = new Date(item.dt * 1000);
  const w = item.weather?.[0];
  return {
    at: item.dt * 1000,
    label: formatTime(date),
    tempC: round1(item.temp ?? 0),
    popPct: Math.round((item.pop ?? 0) * 100),
    description: w?.description ?? "",
    icon: w?.icon ? iconUrl(w.icon) : "",
  };
}

function mapAlert(a: OwOneCallAlert): OpenWeatherAlert {
  const start = a.start ?? 0;
  const end = a.end ?? start;
  return {
    event: a.event ?? "Weeralert",
    senderName: a.sender_name ?? "",
    startAt: formatAlertTime(start),
    endAt: formatAlertTime(end),
    description: a.description ?? "",
  };
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
    alerts: [],
    dataSource: "2.5",
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

/** Zorgt dat oude/gedeeltelijke API- of cache-responses niet crashen. */
export function normalizeOpenWeatherSupplement(
  raw: Partial<OpenWeatherSupplement> | null | undefined
): OpenWeatherSupplement | null {
  if (!raw?.current) return null;

  return {
    current: raw.current,
    hourly: Array.isArray(raw.hourly) ? raw.hourly : [],
    daily: Array.isArray(raw.daily) ? raw.daily : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    dataSource: raw.dataSource === "onecall-3" ? "onecall-3" : "2.5",
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}
