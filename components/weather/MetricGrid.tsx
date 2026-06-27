"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Droplets,
  Gauge,
  Home,
  Minus,
  Sun,
} from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { shouldShowHeatIndex } from "@/lib/weer/heat-index";
import { formatBaromTrendDelta } from "@/lib/weer/barom-trend";
import { getWindDirection, resolveWindDegrees } from "@/lib/utils/wind";
import { WindArrow } from "@/components/weather/WindArrow";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricGridProps {
  data: WeerLive;
}

function StatCell({
  children,
  label,
  value,
  detail,
  className,
}: {
  children?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 p-4", className)}>
      {children ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle">
          {children}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-surface-muted">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-foreground">
          {value}
        </p>
        {detail ? (
          <div className="mt-1.5 text-[0.65rem] leading-snug text-surface-muted">
            {detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FooterStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[0.6rem] uppercase tracking-wide text-surface-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function MetricGrid({ data }: MetricGridProps) {
  const windDeg = resolveWindDegrees(data);
  const uv = Number(data.uv ?? 0);
  const windSpeed = Number(data.windspeed_kmh ?? data.windspd_avg10m_kmh ?? 0);
  const windAvg = Number(data.windspd_avg10m_kmh ?? 0);
  const windGust = Number(data.windgust_kmh ?? 0);
  const showHitteIndex = shouldShowHeatIndex(data);
  const footerCols = showHitteIndex
    ? "sm:grid-cols-3 lg:grid-cols-6"
    : "sm:grid-cols-2 lg:grid-cols-5";

  return (
    <Card variant="weather" className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-y divide-card-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <StatCell
            label={`Wind · ${getWindDirection(windDeg)}`}
            value={
              <>
                {windSpeed.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-surface-muted">km/u</span>
              </>
            }
            detail={
              <>
                Gem. 10 min {windAvg.toFixed(1)} · Stoot {windGust.toFixed(1)} km/u
              </>
            }
          >
            <WindArrow degrees={windDeg} className="text-sky-400" size={28} />
          </StatCell>

          <StatCell
            label="Regen vandaag"
            value={
              <>
                {Number(data.dailyrain_mm ?? 0).toFixed(1)}
                <span className="ml-1 text-sm font-normal text-surface-muted">mm</span>
              </>
            }
            detail={
              <>
                Maand {data.monthlyrain_mm ?? "—"} mm · Jaar {data.yearlyrain_mm ?? "—"} mm
              </>
            }
          >
            <Droplets className="h-5 w-5 text-blue-400" />
          </StatCell>

          <StatCell
            label="Luchtdruk"
            value={
              <>
                {Number(data.baromrel_hpa ?? 0).toFixed(1)}
                <span className="ml-1 text-sm font-normal text-surface-muted">hPa</span>
              </>
            }
            detail={
              data.barom_trend_delta_hpa != null && data.barom_trend_direction ? (
                <p
                  className={cn(
                    "flex items-center gap-1 font-medium tabular-nums",
                    data.barom_trend_direction === "up" && "text-emerald-400",
                    data.barom_trend_direction === "down" && "text-amber-400",
                    data.barom_trend_direction === "steady" && "text-surface-muted"
                  )}
                >
                  {data.barom_trend_direction === "up" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : data.barom_trend_direction === "down" ? (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {formatBaromTrendDelta(data.barom_trend_delta_hpa)} hPa ·{" "}
                  {data.barom_trend_hours ?? 3} u
                </p>
              ) : (
                "Trend na 3 uur data"
              )
            }
          >
            <Gauge className="h-5 w-5 text-violet-400" />
          </StatCell>

          <StatCell
            label="Zon & UV"
            value={
              <span className={uv >= 3 ? "text-amber-400" : undefined}>{data.uv ?? "—"}</span>
            }
            detail={`Straling ${Number(data.solarradiation ?? 0).toFixed(0)} W/m²`}
          >
            <Sun className="h-5 w-5 text-amber-400" />
          </StatCell>
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-3 border-t border-card-border bg-surface-inset px-4 py-3",
            footerCols
          )}
        >
          <FooterStat label="Vocht buiten" value={`${data.humidity ?? "—"}%`} />
          <FooterStat label="Dauwpunt" value={`${data.dauwpunt ?? "—"} °C`} />
          <FooterStat
            label="Windchill"
            value={
              data.gevoelstemperatuur != null ? (
                <span
                  className={
                    Number(data.gevoelstemperatuur) <
                    Number(data.temp_c ?? data.gevoelstemperatuur)
                      ? "text-sky-300"
                      : undefined
                  }
                >
                  {data.gevoelstemperatuur} °C
                </span>
              ) : (
                "—"
              )
            }
          />
          {showHitteIndex ? (
            <FooterStat
              label="Hitte-index"
              value={
                <span className="text-orange-300">{data.hitte_index_c} °C</span>
              }
            />
          ) : null}
          <FooterStat
            label="Binnen"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
                {data.tempin_c ?? "—"} °C
              </span>
            }
          />
          <FooterStat label="Vocht binnen" value={`${data.humidityin ?? "—"}%`} />
        </div>
      </CardContent>
    </Card>
  );
}
