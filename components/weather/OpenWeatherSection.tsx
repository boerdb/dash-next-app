"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import type { OpenWeatherAlert, OpenWeatherSupplement } from "@/lib/api/types";
import { normalizeOpenWeatherSupplement } from "@/lib/openweather/map";
import { getWindDirection } from "@/lib/utils/wind";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const OpenWeatherMinutelyChart = dynamic(
  () =>
    import("@/components/weather/OpenWeatherMinutelyChart").then(
      (m) => m.OpenWeatherMinutelyChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[100px] w-full rounded-xl" />,
  }
);

interface OpenWeatherSectionProps {
  data: OpenWeatherSupplement;
}

function dataSourceLabel(dataSource: OpenWeatherSupplement["dataSource"]): string {
  return dataSource === "onecall-3" ? "One Call 3.0" : "Forecast 2.5 (fallback)";
}

function fmt(value: string | number | null | undefined, suffix = ""): string {
  if (value == null || value === "") return "—";
  return `${value}${suffix}`;
}

export function OpenWeatherSection({ data }: OpenWeatherSectionProps) {
  const normalized = normalizeOpenWeatherSupplement(data);
  if (!normalized) return null;

  const { current, minutely, hourly, daily, alerts, dataSource } = normalized;
  const hourlyTitle =
    dataSource === "onecall-3" ? "Komende uren" : "Komende uren (elke 3 u)";

  const precipLabel =
    current.rainMm1h != null && current.rainMm1h > 0
      ? `${current.rainMm1h} mm/u`
      : current.snowMm1h != null && current.snowMm1h > 0
        ? `${current.snowMm1h} mm/u sneeuw`
        : "Geen";

  const windLabel =
    current.windSpeedKmh != null
      ? `${current.windSpeedKmh} km/u${current.windDeg != null ? ` ${getWindDirection(current.windDeg)}` : ""}`
      : "—";

  return (
    <Card variant="weather">
      <CardContent className="space-y-4">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="border-l-2 border-sky-500/50 pl-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Voorspelling & aanvulling
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                dataSource === "onecall-3"
                  ? "bg-sky-500/20 text-sky-300"
                  : "bg-zinc-500/20 text-zinc-400"
              )}
            >
              {dataSourceLabel(dataSource)}
            </span>
          </div>
          <p className="mt-1 text-[0.65rem] text-zinc-500">
            OpenWeather · Harlingen · modeldata, niet je weerstation
          </p>
        </header>

        {alerts.length > 0 && (
          <section className="space-y-2">
            {alerts.map((alert, i) => (
              <WeatherAlertCard key={`${alert.event}-${alert.startAt}-${i}`} alert={alert} />
            ))}
          </section>
        )}

        <CurrentStatusBlock current={current} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SupplementChip icon={Eye} label="Zicht" value={fmt(current.visibilityKm, " km")} />
          <SupplementChip icon={Cloud} label="Bewolking" value={fmt(current.cloudsPct, "%")} />
          <SupplementChip
            icon={Droplets}
            label="Rel. vocht"
            value={fmt(current.humidityPct, "%")}
          />
          <SupplementChip
            icon={Thermometer}
            label="Dauwpunt"
            value={fmt(current.dewPointC, "°C")}
          />
          <SupplementChip
            icon={Gauge}
            label="Luchtdruk"
            value={fmt(current.pressureHpa, " hPa")}
          />
          <SupplementChip icon={Sun} label="UV-index" value={fmt(current.uvi)} />
          <SupplementChip icon={Wind} label="Wind" value={windLabel} />
          <SupplementChip icon={Droplets} label="Neerslag" value={precipLabel} />
        </div>

        {minutely.length > 0 && (
          <section>
            <p className="mb-2 border-l-2 border-sky-500/50 pl-2 text-[0.65rem] uppercase tracking-wide text-zinc-500">
              Neerslag komende 60 min (model)
            </p>
            <OpenWeatherMinutelyChart data={minutely} />
          </section>
        )}

        {hourly.length > 0 && (
          <section>
            <p className="mb-2 border-l-2 border-sky-500/50 pl-2 text-[0.65rem] uppercase tracking-wide text-zinc-500">
              {hourlyTitle}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {hourly.map((h) => (
                <HourlyChip key={h.at} item={h} />
              ))}
            </div>
          </section>
        )}

        {daily.length > 0 && (
          <section>
            <p className="mb-2 border-l-2 border-sky-500/50 pl-2 text-[0.65rem] uppercase tracking-wide text-zinc-500">
              5-daagse voorspelling
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {daily.map((d) => (
                <DailyChip key={d.dagKey} item={d} />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[0.6rem] text-zinc-600">
          OpenWeather {dataSourceLabel(dataSource)} · ververst ca. elk half uur
        </p>
      </CardContent>
    </Card>
  );
}

function WeatherAlertCard({ alert }: { alert: OpenWeatherAlert }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2.5">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-100">{alert.event}</p>
          <p className="mt-0.5 text-[0.65rem] text-amber-200/80">
            {alert.startAt} – {alert.endAt}
            {alert.senderName ? ` · ${alert.senderName}` : null}
          </p>
          {alert.description ? (
            <details className="mt-1.5 group">
              <summary className="cursor-pointer text-[0.65rem] text-amber-300/90 marker:content-none list-none [&::-webkit-details-marker]:hidden">
                <span className="underline decoration-amber-500/50 underline-offset-2 group-open:hidden">
                  Toon melding
                </span>
                <span className="hidden underline decoration-amber-500/50 underline-offset-2 group-open:inline">
                  Verberg melding
                </span>
              </summary>
              <p className="mt-1.5 whitespace-pre-wrap text-[0.7rem] leading-relaxed text-amber-100/90">
                {alert.description}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CurrentStatusBlock({
  current,
}: {
  current: OpenWeatherSupplement["current"];
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      {current.icon ? (
        <img src={current.icon} alt="" width={48} height={48} className="h-12 w-12" />
      ) : null}
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-sm font-medium capitalize text-zinc-200">{current.description}</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-white">
          {fmt(current.tempC, "°C")}
          {current.feelsLikeC != null && (
            <span className="ml-2 text-sm font-normal text-zinc-400">
              (gevoel {current.feelsLikeC}°C)
            </span>
          )}
        </p>
        <p className="text-[0.65rem] text-zinc-500">Model · regio Harlingen</p>
      </div>
    </div>
  );
}

function SupplementChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-sky-500/10 bg-black/30 px-2 py-2.5 text-center">
      <Icon className="mb-1 h-4 w-4 text-sky-400/80" />
      <span className="text-[0.6rem] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}

function tempColorClass(tempC: number): string {
  if (tempC <= 5) return "text-sky-300";
  if (tempC >= 20) return "text-orange-300";
  return "text-white";
}

function HourlyChip({
  item,
}: {
  item: OpenWeatherSupplement["hourly"][number];
}) {
  return (
    <div className="flex min-w-[5rem] shrink-0 flex-col items-center rounded-xl border border-sky-500/10 bg-black/30 px-2 py-2">
      <span className="text-[0.65rem] font-medium text-zinc-400">{item.label}</span>
      {item.icon ? (
        <img src={item.icon} alt="" width={36} height={36} className="my-0.5 h-9 w-9" />
      ) : null}
      <span className={cn("text-sm font-bold tabular-nums", tempColorClass(item.tempC))}>
        {item.tempC}°
      </span>
      <span
        className={cn(
          "text-[0.65rem] tabular-nums",
          item.popPct >= 50 ? "text-sky-300" : "text-zinc-500"
        )}
      >
        {item.popPct}% regen
      </span>
      {(item.windSpeedKmh != null || item.humidityPct != null) && (
        <span className="mt-0.5 text-[0.6rem] text-zinc-500">
          {item.windSpeedKmh != null ? `${item.windSpeedKmh} km/u` : ""}
          {item.windSpeedKmh != null && item.humidityPct != null ? " · " : ""}
          {item.humidityPct != null ? `${item.humidityPct}%` : ""}
        </span>
      )}
    </div>
  );
}

function DailyChip({
  item,
}: {
  item: OpenWeatherSupplement["daily"][number];
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/30 px-2 py-2.5 text-center">
      <span className="text-[0.65rem] font-semibold uppercase text-zinc-400">{item.label}</span>
      {item.icon ? (
        <img src={item.icon} alt="" width={40} height={40} className="my-1 h-10 w-10" />
      ) : null}
      <span className="text-xs font-bold tabular-nums">
        <span className={tempColorClass(item.tempMinC)}>{item.tempMinC}°</span>
        <span className="text-zinc-500"> / </span>
        <span className={tempColorClass(item.tempMaxC)}>{item.tempMaxC}°</span>
      </span>
      <span
        className={cn(
          "mt-0.5 text-[0.6rem]",
          item.popPct >= 40 ? "text-sky-300" : "text-zinc-500"
        )}
      >
        {item.popPct}% regen
      </span>
      {item.uviMax != null && (
        <span className="text-[0.6rem] text-amber-300/90">UV {item.uviMax}</span>
      )}
      {item.windSpeedKmh != null && (
        <span className="text-[0.6rem] text-zinc-500">
          Wind {item.windSpeedKmh} km/u
          {item.windDeg != null ? ` ${getWindDirection(item.windDeg)}` : ""}
        </span>
      )}
      {(item.sunriseAt || item.sunsetAt) && (
        <span className="text-[0.55rem] text-zinc-600">
          {item.sunriseAt ? `↑${item.sunriseAt}` : ""}
          {item.sunriseAt && item.sunsetAt ? " " : ""}
          {item.sunsetAt ? `↓${item.sunsetAt}` : ""}
        </span>
      )}
    </div>
  );
}
