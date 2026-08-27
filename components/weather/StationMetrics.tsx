"use client";

import { useMemo } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import type { WeerHistorie, WeerLive } from "@/lib/api/types";
import { Metric, MetricRow, MetricTrend } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { formatBaromTrendDelta } from "@/lib/weer/barom-trend";
import { hasWh40Sensor, hasWs90Sensor } from "@/lib/weer/sensor-status";
import { regenMmFromWeer } from "@/lib/weer/regen-dag";
import { resolveIlluminanceLux } from "@/lib/weer/ws90-lux";
import { resolveRainRateMm } from "@/lib/weer/ws90-rain";
function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatValue(value: unknown, decimals = 1, fallback = "—"): string {
  const n = finiteNumber(value);
  return n === null ? fallback : n.toFixed(decimals);
}

function DailyRange({
  min,
  max,
  minTime,
  maxTime,
  unit,
  decimals = 1,
}: {
  min?: unknown;
  max?: unknown;
  minTime?: string | null;
  maxTime?: string | null;
  unit?: string;
  decimals?: number;
}) {
  const minN = finiteNumber(min);
  const maxN = finiteNumber(max);
  if (minN === null && maxN === null) return null;
  return (
    <p className="text-caption mt-1 text-surface-muted">
      {maxN !== null ? (
        <span className="inline-flex items-center gap-0.5 text-accent-energy">
          <ArrowUp className="h-3 w-3" />
          {formatValue(max, decimals)}
          {unit ? ` ${unit}` : ""}
          {maxTime ? ` ${maxTime}` : ""}
        </span>
      ) : null}
      {minN !== null ? (
        <span className="ml-2 inline-flex items-center gap-0.5 text-accent-weather">
          <ArrowDown className="h-3 w-3" />
          {formatValue(min, decimals)}
          {unit ? ` ${unit}` : ""}
          {minTime ? ` ${minTime}` : ""}
        </span>
      ) : null}
    </p>
  );
}

function TempTrend({ historie }: { historie?: WeerHistorie }) {
  const trend = useMemo(() => {
    const values = historie?.temperatures
      ?.map((value) => finiteNumber(value))
      .filter((value): value is number => value !== null);
    if (!values || values.length < 2) return null;
    const delta = Math.round((values[values.length - 1] - values[0]) * 10) / 10;
    if (delta >= 0.3) return { delta, dir: "up" as const };
    if (delta <= -0.3) return { delta, dir: "down" as const };
    return { delta, dir: "neutral" as const };
  }, [historie]);

  if (!trend) return null;

  return (
    <MetricTrend direction={trend.dir === "up" ? "up" : trend.dir === "down" ? "down" : "neutral"}>
      {trend.dir === "up" ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : trend.dir === "down" ? (
        <ArrowDownRight className="h-3.5 w-3.5" />
      ) : (
        <Minus className="h-3.5 w-3.5" />
      )}
      {trend.delta > 0 ? "+" : ""}
      {trend.delta.toFixed(1)} °C/u · 24 uur
    </MetricTrend>
  );
}

export function StationMetrics({
  data,
  historie,
}: {
  data: WeerLive;
  historie?: WeerHistorie;
}) {
  const rainToday = regenMmFromWeer(data);
  const rainRate = resolveRainRateMm(data);
  const lux = resolveIlluminanceLux(data);
  const baromDir = data.barom_trend_direction ?? "steady";
  const baromDelta = finiteNumber(data.barom_trend_delta_hpa);
  const wh40 = hasWh40Sensor(data);
  const piezoToday = finiteNumber(data.dailyrain_piezo_mm);

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-6">
        <MetricRow>
          <div>
            <Metric label="Buiten" value={formatValue(data.temp_c)} unit="°C" />
            <DailyRange
              min={data.temp_min_c}
              max={data.temp_max_c}
              minTime={data.temp_min_time}
              maxTime={data.temp_max_time}
              unit="°C"
            />
            <TempTrend historie={historie} />
          </div>
          <div>
            <Metric label="Vochtigheid" value={data.humidity ?? "—"} unit="%" />
            <DailyRange
              min={data.humidity_min}
              max={data.humidity_max}
              minTime={data.humidity_min_time}
              maxTime={data.humidity_max_time}
              unit="%"
            />
            <p className="text-caption mt-1 text-surface-muted">
              Dauwpunt {data.dauwpunt ?? "—"} °C
            </p>
          </div>
          <div>
            <Metric label="Binnen" value={data.tempin_c ?? "—"} unit="°C" />
            <DailyRange
              min={data.tempin_min_c}
              max={data.tempin_max_c}
              minTime={data.tempin_min_time}
              maxTime={data.tempin_max_time}
              unit="°C"
            />
          </div>
          <div>
            <Metric label="Binnen vocht" value={data.humidityin ?? "—"} unit="%" />
          </div>
        </MetricRow>

        <MetricRow>
          <div>
            <Metric
              label="Zonstraling"
              value={formatValue(data.solarradiation, 0)}
              unit="W/m²"
            />
            <DailyRange
              min={undefined}
              max={data.solar_max}
              maxTime={data.solar_max_time}
              unit="W/m²"
              decimals={0}
            />
          </div>
          {hasWs90Sensor(data) && lux != null ? (
            <div>
              <Metric label="Licht (WS90)" value={formatValue(lux, 0)} unit="lux" />
              <DailyRange
                min={undefined}
                max={data.illuminance_max}
                maxTime={data.illuminance_max_time}
                unit="lux"
                decimals={0}
              />
            </div>
          ) : null}
          <div>
            <Metric label="UV-index" value={data.uv ?? "—"} />
            <DailyRange
              min={undefined}
              max={data.uv_max}
              maxTime={data.uv_max_time}
              decimals={0}
            />
          </div>
          <div>
            <Metric label="Luchtdruk rel." value={formatValue(data.baromrel_hpa)} unit="hPa" />
            <DailyRange
              min={data.baromrel_min_hpa}
              max={data.baromrel_max_hpa}
              minTime={data.baromrel_min_time}
              maxTime={data.baromrel_max_time}
              unit="hPa"
            />
          </div>
          <div>
            <Metric label="Luchtdruk abs." value={formatValue(data.baromabs_hpa)} unit="hPa" />
            <DailyRange
              min={data.baromabs_min_hpa}
              max={data.baromabs_max_hpa}
              minTime={data.baromabs_min_time}
              maxTime={data.baromabs_max_time}
              unit="hPa"
            />
          </div>
        </MetricRow>

        {baromDelta !== null ? (
          <MetricTrend
            direction={
              baromDir === "up" ? "up" : baromDir === "down" ? "down" : "neutral"
            }
          >
            {baromDir === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : baromDir === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {formatBaromTrendDelta(baromDelta)} hPa · {data.barom_trend_hours ?? 3} u
          </MetricTrend>
        ) : null}

        <div className="border-t border-border-subtle pt-4">
          <MetricRow>
            <Metric
              label={wh40 ? "Regen WH40" : "Regen vandaag"}
              value={rainToday.toFixed(1)}
              unit="mm"
              accent="weather"
            />
            {wh40 && piezoToday !== null ? (
              <Metric label="Piezo WS90" value={piezoToday.toFixed(1)} unit="mm" />
            ) : null}
            <Metric
              label="Regen nu"
              value={rainRate !== undefined ? rainRate.toFixed(1) : "—"}
              unit="mm/u"
              accent="weather"
            />
            <Metric label="24 uur" value={data.last24hrain_mm ?? "—"} unit="mm" />
            <Metric label="Maand" value={data.monthlyrain_mm ?? "—"} unit="mm" />
          </MetricRow>
        </div>

        {(data.temp2_c != null || data.humidity2 != null) && (
          <MetricRow>
            {data.temp2_c != null ? (
              <Metric label="Kanaal 2 temp" value={formatValue(data.temp2_c)} unit="°C" />
            ) : null}
            {data.humidity2 != null ? (
              <Metric label="Kanaal 2 vocht" value={data.humidity2} unit="%" />
            ) : null}
          </MetricRow>
        )}

        {hasWs90Sensor(data) || wh40 ? (
          <div className="border-t border-border-subtle pt-4">
            {hasWs90Sensor(data) ? (
              <>
                <p className="text-label mb-3 text-surface-muted">WS90</p>
                <MetricRow>
                  {data.ws90_voltage_v != null ? (
                    <Metric label="Batterij" value={`${data.ws90_voltage_v}`} unit="V" size="sm" />
                  ) : null}
                  {data.ws90_cap_voltage_v != null ? (
                    <Metric label="Supercap" value={`${data.ws90_cap_voltage_v}`} unit="V" size="sm" />
                  ) : null}
                </MetricRow>
              </>
            ) : null}
            {wh40 ? (
              <>
                <p
                  className={
                    hasWs90Sensor(data)
                      ? "text-label mb-3 mt-4 text-surface-muted"
                      : "text-label mb-3 text-surface-muted"
                  }
                >
                  WH40
                </p>
                <MetricRow>
                  <Metric label="Batterij" value={`${data.wh40batt}`} unit="V" size="sm" />
                </MetricRow>
              </>
            ) : null}
          </div>
        ) : null}
      </SurfaceBody>
    </Surface>
  );
}
