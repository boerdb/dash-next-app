"use client";

import type { WeerLive } from "@/lib/api/types";
import { DailyRange } from "@/components/ui/daily-range";
import {
  getWindDirection,
  resolveWindDegrees,
  windArrowRotation,
} from "@/lib/utils/wind";
import { Metric } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER_R = 92;

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
  return <g className="text-accent-weather/50">{ticks}</g>;
}

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
      className={sustained ? "text-accent-export" : "text-accent-weather"}
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

function WindCompass({ data }: { data: WeerLive }) {
  const realtimeDeg =
    data.winddir != null && !Number.isNaN(Number(data.winddir))
      ? Number(data.winddir)
      : resolveWindDegrees(data);
  const sustainedDeg = finiteNumber(data.winddir_avg10m) ?? realtimeDeg;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[180px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-border"
        />
        <CompassTicks />
        <text x={CENTER} y="18" textAnchor="middle" className="fill-surface-muted text-[11px] font-bold">
          N
        </text>
        <text x={CENTER} y={SIZE - 10} textAnchor="middle" className="fill-surface-muted text-[11px] font-bold">
          Z
        </text>
        <text x="14" y={CENTER + 4} textAnchor="middle" className="fill-surface-muted text-[11px] font-bold">
          W
        </text>
        <text x={SIZE - 14} y={CENTER + 4} textAnchor="middle" className="fill-surface-muted text-[11px] font-bold">
          O
        </text>
        <OuterWindMarker rotation={windArrowRotation(sustainedDeg)} kind="sustained" />
        <OuterWindMarker rotation={windArrowRotation(realtimeDeg)} kind="realtime" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-label text-surface-muted">Real-time</span>
        <span className="text-metric mt-0.5 text-foreground">
          {Math.round(realtimeDeg)}°
        </span>
        <span className="text-caption mt-1 font-semibold text-accent-export">
          {getWindDirection(realtimeDeg)}
        </span>
      </div>
    </div>
  );
}

export function WindRosette({ data }: { data: WeerLive }) {
  const windSpeed =
    finiteNumber(data.windspeed_kmh) ?? finiteNumber(data.windspd_avg10m_kmh) ?? 0;
  const gust = finiteNumber(data.windgust_kmh) ?? 0;
  const sustainedSpeed = finiteNumber(data.windspd_avg10m_kmh) ?? 0;
  const sustainedDir = finiteNumber(data.winddir_avg10m);

  return (
    <Surface level="raised">
      <SurfaceBody>
        <p className="text-label mb-4 text-surface-muted">Wind</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <Metric label="Wind" value={windSpeed.toFixed(1)} unit="km/u" accent="weather" />
            <DailyRange
              max={data.maxdailywind_kmh}
              maxTime={data.maxdailywind_time}
              unit="km/u"
            />
          </div>
          <WindCompass data={data} />
          <div className="text-right">
            <Metric
              label="Stoot"
              value={gust.toFixed(1)}
              unit="km/u"
              accent="energy"
              className="text-right"
            />
            <DailyRange
              max={data.maxdailygust_kmh}
              maxTime={data.maxdailygust_time}
              unit="km/u"
              align="right"
            />
          </div>
        </div>
        <p className="text-caption mt-4 text-center text-surface-muted">
          Sustained {sustainedSpeed.toFixed(1)} km/u · {getWindDirection(sustainedDir ?? 0)}
        </p>
        <p className="text-caption mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-surface-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-accent-weather"
              aria-hidden
            />
            Real-time wind
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rotate-45 border border-accent-export bg-transparent"
              aria-hidden
            />
            Sustained 10 min
          </span>
        </p>
      </SurfaceBody>
    </Surface>
  );
}
