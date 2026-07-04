"use client";

import { useMemo, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Battery,
  BatteryWarning,
  CloudLightning,
  Minus,
} from "lucide-react";
import type { WeerHistorie, WeerLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  getWindDirection,
  resolveWindDegrees,
  windArrowRotation,
} from "@/lib/utils/wind";
import { cn } from "@/lib/utils";
import { formatBaromTrendDelta } from "@/lib/weer/barom-trend";
import { getLightningBattery } from "@/lib/weer/sensor-battery";
import {
  getLightningStatus,
  getLightningStatusLabel,
} from "@/lib/weer/lightning-storm";
import {
  hasLightningSensor,
  hasWs90Sensor,
  isWh57Detected,
} from "@/lib/weer/sensor-status";
import { regenMmFromWeer } from "@/lib/weer/regen-dag";
import { resolveRainRateMm } from "@/lib/weer/ws90-rain";

interface WeatherRosetteDashboardProps {
  data: WeerLive;
  historie?: WeerHistorie;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER_R = 92;

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatValue(value: unknown, decimals = 1, fallback = "—"): string {
  const n = finiteNumber(value);
  return n === null ? fallback : n.toFixed(decimals);
}

function EcowittCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-card-border bg-surface-inset/60 p-2.5 shadow-sm sm:p-3.5",
        className
      )}
    >
      <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-surface-muted sm:mb-3 sm:text-[0.65rem] sm:tracking-[0.18em]">
        {title}
      </p>
      {children}
    </div>
  );
}

function MetricPair({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>{children}</div>
  );
}

function MetricValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
}) {
  return (
    <div>
      <p className="text-[0.6rem] uppercase tracking-wide text-surface-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold leading-none tabular-nums text-foreground sm:text-2xl">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-surface-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

function DailyMax({
  value,
  time,
  unit,
  decimals = 1,
}: {
  value: unknown;
  time?: string | null;
  unit?: string;
  decimals?: number;
}) {
  if (finiteNumber(value) === null) return null;
  return (
    <p className="inline-flex flex-wrap items-center gap-x-1 text-[0.65rem] font-semibold tabular-nums text-orange-400 sm:text-[0.7rem]">
      <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
      <span>
        {formatValue(value, decimals)}
        {unit ? ` ${unit}` : ""}
      </span>
      {time ? <span className="font-normal text-surface-muted">{time}</span> : null}
    </p>
  );
}

function DailyMin({
  value,
  time,
  unit,
  decimals = 1,
}: {
  value: unknown;
  time?: string | null;
  unit?: string;
  decimals?: number;
}) {
  if (finiteNumber(value) === null) return null;
  return (
    <p className="inline-flex flex-wrap items-center gap-x-1 text-[0.65rem] font-semibold tabular-nums text-sky-400 sm:text-[0.7rem]">
      <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
      <span>
        {formatValue(value, decimals)}
        {unit ? ` ${unit}` : ""}
      </span>
      {time ? <span className="font-normal text-surface-muted">{time}</span> : null}
    </p>
  );
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
  return (
    <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
      <DailyMax value={max} time={maxTime} unit={unit} decimals={decimals} />
      <DailyMin value={min} time={minTime} unit={unit} decimals={decimals} />
    </div>
  );
}

function CompassTicks() {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const angle = i * 5;
    const major = angle % 45 === 0;
    const cardinal = angle % 90 === 0;
    const len = cardinal ? 12 : major ? 8 : 4;
    const rad = (angle * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    ticks.push(
      <line
        key={i}
        x1={CENTER + OUTER_R * sin}
        y1={CENTER - OUTER_R * cos}
        x2={CENTER + (OUTER_R - len) * sin}
        y2={CENTER - (OUTER_R - len) * cos}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={cardinal ? 2 : major ? 1.5 : 1}
        opacity={cardinal ? 0.8 : major ? 0.5 : 0.22}
      />
    );
  }
  return <g className="text-cyan-300/80">{ticks}</g>;
}

/** Buitenste windpijl op de ring (Ecowitt-stijl), wijst naar het midden. */
function OuterWindMarker({
  rotation,
  kind,
}: {
  rotation: number;
  kind: "realtime" | "sustained";
}) {
  const sustained = kind === "sustained";
  const tipY = CENTER - OUTER_R + 4;
  const baseY = CENTER - OUTER_R - 12;
  return (
    <g
      className={sustained ? "text-emerald-300" : "text-sky-300"}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${CENTER}px ${CENTER}px`,
        transition: "transform 0.7s ease",
      }}
    >
      <polygon
        points={`${CENTER},${tipY} ${CENTER - 7},${baseY} ${CENTER + 7},${baseY}`}
        fill={sustained ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={sustained ? 2 : 0}
        strokeLinejoin="round"
      />
    </g>
  );
}

function WindRosette({ data }: { data: WeerLive }) {
  const realtimeDeg =
    data.winddir != null && !Number.isNaN(Number(data.winddir))
      ? Number(data.winddir)
      : resolveWindDegrees(data);
  const sustainedDeg = finiteNumber(data.winddir_avg10m) ?? realtimeDeg;
  const rotation = windArrowRotation(realtimeDeg);
  const sustainedRotation = windArrowRotation(sustainedDeg);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[200px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-cyan-400/30"
        />
        <CompassTicks />
        <text
          x={CENTER}
          y="18"
          textAnchor="middle"
          className="fill-surface-muted text-[11px] font-bold"
        >
          N
        </text>
        <text
          x={CENTER}
          y={SIZE - 10}
          textAnchor="middle"
          className="fill-surface-muted text-[11px] font-bold"
        >
          Z
        </text>
        <text
          x="14"
          y={CENTER + 4}
          textAnchor="middle"
          className="fill-surface-muted text-[11px] font-bold"
        >
          W
        </text>
        <text
          x={SIZE - 14}
          y={CENTER + 4}
          textAnchor="middle"
          className="fill-surface-muted text-[11px] font-bold"
        >
          O
        </text>
        <OuterWindMarker rotation={sustainedRotation} kind="sustained" />
        <OuterWindMarker rotation={rotation} kind="realtime" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-surface-muted">
          Real-time
        </span>
        <span className="mt-0.5 text-3xl font-bold leading-none tabular-nums text-foreground">
          {Math.round(realtimeDeg)}
          <span className="align-top text-base">°</span>
        </span>
        <span className="mt-1 text-sm font-bold text-emerald-300">
          {getWindDirection(realtimeDeg)}
        </span>
      </div>
    </div>
  );
}

function WindCard({ data }: { data: WeerLive }) {
  const windSpeed =
    finiteNumber(data.windspeed_kmh) ?? finiteNumber(data.windspd_avg10m_kmh) ?? 0;
  const gust = finiteNumber(data.windgust_kmh) ?? 0;
  const sustainedSpeed = finiteNumber(data.windspd_avg10m_kmh) ?? 0;
  const sustainedDir = finiteNumber(data.winddir_avg10m);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="text-center sm:text-left">
        <MetricValue label="Wind" value={windSpeed.toFixed(1)} unit="km/u" />
        <DailyMax
          value={data.maxdailywind_kmh}
          time={data.maxdailywind_time}
          unit="km/u"
        />
      </div>
      <WindRosette data={data} />
      <div className="text-center sm:text-right">
        <MetricValue label="Stoot" value={gust.toFixed(1)} unit="km/u" />
        <DailyMax
          value={data.maxdailygust_kmh}
          time={data.maxdailygust_time}
          unit="km/u"
        />
      </div>
      <p className="col-span-3 mt-1 text-center text-[0.6rem] text-surface-muted">
        Sustained {sustainedSpeed.toFixed(1)} km/u ·{" "}
        {getWindDirection(sustainedDir ?? 0)}
      </p>
    </div>
  );
}

function formatStrikeTime(iso: string): string {
  const parts = iso.split(" ");
  if (parts.length < 2) return iso;
  return parts[1]?.slice(0, 5) ?? iso;
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-inset px-3 py-2.5 text-center">
      <p className="text-[0.6rem] uppercase tracking-wide text-surface-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function LightningCard({ data }: { data: WeerLive }) {
  if (!hasLightningSensor(data)) return null;

  const lightningStatus = getLightningStatus(data);
  const wh57Detected = isWh57Detected(data);
  const lightningBattery = getLightningBattery(data);
  const recentStrike = lightningStatus === "strike";
  const lightningKm = data.lightning_km;
  const statusLabel = getLightningStatusLabel(data);

  return (
    <>
      <div className="flex items-start gap-3">
        <CloudLightning
          className={cn(
            "mt-0.5 h-6 w-6 shrink-0",
            recentStrike && "text-violet-300",
            lightningStatus === "risk" && "text-amber-300",
            lightningStatus === "airmass" && "text-amber-300/70",
            lightningStatus === "idle" && wh57Detected && "text-emerald-400",
            lightningStatus === "idle" && !wh57Detected && "text-surface-muted"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {wh57Detected ? (
              <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-emerald-200">
                WH57 gedetecteerd
              </span>
            ) : null}
            {recentStrike ? (
              <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-violet-200">
                Recent
              </span>
            ) : lightningStatus === "risk" ? (
              <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-200">
                Kans op onweer
              </span>
            ) : lightningStatus === "airmass" ? (
              <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-200/70">
                Onweersgevoelig
              </span>
            ) : null}
          </div>
          {lightningKm != null && lightningKm > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric
                label="Afstand"
                value={
                  <>
                    {lightningKm}
                    <span className="ml-0.5 text-xs font-normal text-surface-muted">km</span>
                  </>
                }
              />
              <MiniMetric label="Vandaag" value={data.lightning_num ?? 0} />
              <MiniMetric
                label="Laatste"
                value={data.lightning_time ? formatStrikeTime(data.lightning_time) : "—"}
              />
            </div>
          ) : (
            <p
              className={cn(
                "text-sm font-medium",
                lightningStatus === "risk" && "text-amber-200/90",
                lightningStatus === "airmass" && "text-amber-200/70",
                lightningStatus === "idle" && wh57Detected && "text-emerald-200/80",
                lightningStatus === "idle" && !wh57Detected && "text-surface-muted"
              )}
            >
              {statusLabel}
            </p>
          )}
        </div>
        {lightningBattery ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[0.6rem] font-semibold tabular-nums",
              lightningBattery.state === "low"
                ? "border-amber-500/30 text-amber-200"
                : "border-card-border text-surface-muted"
            )}
          >
            {lightningBattery.state === "low" ? (
              <BatteryWarning className="h-3 w-3" aria-hidden />
            ) : (
              <Battery className="h-3 w-3" aria-hidden />
            )}
            {lightningBattery.detail}
          </span>
        ) : null}
      </div>
    </>
  );
}

function Ws90Card({ data }: { data: WeerLive }) {
  if (!hasWs90Sensor(data)) return null;

  return (
    <EcowittCard title="WS90">
      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        {data.ws90_voltage_v != null ? (
          <MiniMetric label="Batterij" value={`${data.ws90_voltage_v} V`} />
        ) : null}
        {data.ws90_cap_voltage_v != null ? (
          <MiniMetric label="Supercap" value={`${data.ws90_cap_voltage_v} V`} />
        ) : null}
      </div>
    </EcowittCard>
  );
}

function SensorStrip({ data }: { data: WeerLive }) {
  if (!hasWs90Sensor(data)) return null;

  return (
    <div className="border-t border-card-border bg-surface-inset/60 p-3">
      <Ws90Card data={data} />
    </div>
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
    return { delta, dir: "steady" as const };
  }, [historie]);

  if (!trend) return null;

  return (
    <p
      className={cn(
        "mt-1.5 inline-flex flex-wrap items-center gap-1 text-[0.65rem] font-medium tabular-nums sm:mt-2 sm:text-[0.7rem]",
        trend.dir === "up" && "text-orange-300",
        trend.dir === "down" && "text-sky-300",
        trend.dir === "steady" && "text-surface-muted"
      )}
    >
      {trend.dir === "up" ? (
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      ) : trend.dir === "down" ? (
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Minus className="h-3.5 w-3.5" aria-hidden />
      )}
      {trend.delta > 0 ? "+" : ""}
      {trend.delta.toFixed(1)} °C/u · 24 uur
    </p>
  );
}

export function WeatherWindDashboard({ data }: { data: WeerLive }) {
  return (
    <Card variant="weather" className="overflow-hidden">
      <CardContent className="p-3 lg:p-4">
        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-surface-muted">
          Wind
        </p>
        <WindCard data={data} />
        <div className="mt-2 text-center text-[0.6rem] text-surface-muted">
          <span className="inline-flex items-center gap-3">
            <span>
              <span className="mr-1 inline-block h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-sky-300" />
              Real-time wind
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rotate-45 border border-emerald-300 bg-transparent" />
              Sustained 10 min
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeatherLightningDashboard({ data }: { data: WeerLive }) {
  if (!hasLightningSensor(data)) return null;

  return (
    <Card variant="weather" className="overflow-hidden border-violet-500/10">
      <CardContent className="p-3 lg:p-4">
        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-surface-muted">
          Bliksem
        </p>
        <LightningCard data={data} />
      </CardContent>
    </Card>
  );
}

export function WeatherMetricsDashboard({ data, historie }: WeatherRosetteDashboardProps) {
  const rainToday = regenMmFromWeer(data);
  const rainRate = resolveRainRateMm(data);
  const baromDir = data.barom_trend_direction ?? "steady";
  const baromDelta = finiteNumber(data.barom_trend_delta_hpa);

  return (
    <Card variant="weather" className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-4 lg:gap-3 lg:p-4">
          <EcowittCard title="Buiten">
            <MetricPair>
              <div>
                <MetricValue
                  label="Temperatuur"
                  value={formatValue(data.temp_c)}
                  unit="°C"
                />
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
                <MetricValue label="Vochtigheid" value={data.humidity ?? "—"} unit="%" />
                <DailyRange
                  min={data.humidity_min}
                  max={data.humidity_max}
                  minTime={data.humidity_min_time}
                  maxTime={data.humidity_max_time}
                  unit="%"
                  decimals={0}
                />
                <p className="mt-1 text-[0.6rem] text-surface-muted sm:text-[0.65rem]">
                  Dauwpunt {data.dauwpunt ?? "—"} °C
                </p>
              </div>
            </MetricPair>
          </EcowittCard>

          <EcowittCard title="Binnen">
            <MetricPair>
              <div>
                <MetricValue label="Temperatuur" value={data.tempin_c ?? "—"} unit="°C" />
                <DailyRange
                  min={data.tempin_min_c}
                  max={data.tempin_max_c}
                  minTime={data.tempin_min_time}
                  maxTime={data.tempin_max_time}
                  unit="°C"
                />
              </div>
              <div>
                <MetricValue label="Vochtigheid" value={data.humidityin ?? "—"} unit="%" />
                <DailyRange
                  min={data.humidityin_min}
                  max={data.humidityin_max}
                  minTime={data.humidityin_min_time}
                  maxTime={data.humidityin_max_time}
                  unit="%"
                  decimals={0}
                />
              </div>
            </MetricPair>
          </EcowittCard>

          <EcowittCard title="Zon & UV">
            <MetricPair>
              <div>
                <MetricValue
                  label="Straling"
                  value={formatValue(data.solarradiation, 0)}
                  unit="W/m²"
                />
                <div className="mt-1">
                  <DailyMax value={data.solar_max} time={data.solar_max_time} unit="W/m²" decimals={0} />
                </div>
              </div>
              <div>
                <MetricValue label="UV-index" value={data.uv ?? "—"} unit="" />
                <div className="mt-1">
                  <DailyMax value={data.uv_max} time={data.uv_max_time} unit="" decimals={0} />
                </div>
              </div>
            </MetricPair>
          </EcowittCard>

          <EcowittCard title="Luchtdruk">
            <MetricPair>
              <div>
                <MetricValue
                  label="Relatief"
                  value={formatValue(data.baromrel_hpa)}
                  unit="hPa"
                />
                <DailyRange
                  min={data.baromrel_min_hpa}
                  max={data.baromrel_max_hpa}
                  minTime={data.baromrel_min_time}
                  maxTime={data.baromrel_max_time}
                  unit="hPa"
                />
              </div>
              <div>
                <MetricValue
                  label="Absoluut"
                  value={formatValue(data.baromabs_hpa)}
                  unit="hPa"
                />
                <DailyRange
                  min={data.baromabs_min_hpa}
                  max={data.baromabs_max_hpa}
                  minTime={data.baromabs_min_time}
                  maxTime={data.baromabs_max_time}
                  unit="hPa"
                />
              </div>
            </MetricPair>
            {baromDelta !== null ? (
              <p
                className={cn(
                  "mt-2 inline-flex flex-wrap items-center gap-1 text-[0.65rem] font-medium tabular-nums sm:text-[0.7rem]",
                  baromDir === "up" && "text-emerald-300",
                  baromDir === "down" && "text-amber-300",
                  baromDir === "steady" && "text-surface-muted"
                )}
              >
                {baromDir === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                ) : baromDir === "down" ? (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                )}
                {formatBaromTrendDelta(baromDelta)} hPa · {data.barom_trend_hours ?? 3} u
              </p>
            ) : null}
          </EcowittCard>

          <EcowittCard title="Regen" className="col-span-2">
            <MetricPair>
              <MetricValue label="Vandaag" value={rainToday.toFixed(1)} unit="mm" />
              <MetricValue
                label="Nu"
                value={rainRate !== undefined ? rainRate.toFixed(1) : "—"}
                unit="mm/u"
              />
            </MetricPair>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.65rem] tabular-nums text-surface-muted sm:grid-cols-3">
              <p>Uur {data.hourlyrain_mm ?? "—"} mm</p>
              <p>24 u {data.last24hrain_mm ?? "—"} mm</p>
              <p>Week {data.weeklyrain_mm ?? "—"} mm</p>
              <p>Maand {data.monthlyrain_mm ?? "—"} mm</p>
              <p className="col-span-2 sm:col-span-1">Jaar {data.yearlyrain_mm ?? "—"} mm</p>
            </div>
          </EcowittCard>

          {data.temp2_c != null || data.humidity2 != null ? (
            <EcowittCard title="Kanaal 2" className="col-span-2">
              <MetricPair>
                {data.temp2_c != null ? (
                  <MetricValue label="Temperatuur" value={formatValue(data.temp2_c)} unit="°C" />
                ) : (
                  <span />
                )}
                {data.humidity2 != null ? (
                  <MetricValue label="Vochtigheid" value={data.humidity2} unit="%" />
                ) : (
                  <span />
                )}
              </MetricPair>
            </EcowittCard>
          ) : null}
          </div>

          <SensorStrip data={data} />
        </CardContent>
      </Card>
  );
}

export function WeatherRosetteDashboard({ data, historie }: WeatherRosetteDashboardProps) {
  return (
    <div className="space-y-3">
      <WeatherWindDashboard data={data} />
      <WeatherLightningDashboard data={data} />
      <WeatherMetricsDashboard data={data} historie={historie} />
    </div>
  );
}
