"use client";

import { useEffect, useRef, useState } from "react";
import type { WeerLive } from "@/lib/api/types";
import { DailyRange } from "@/components/ui/daily-range";
import { Metric } from "@/components/ui/metric";
import { StationCard } from "@/components/weather/station-card";
import {
  getWindDirection,
  nextArrowRotation,
  resolveWindDegrees,
  windArrowRotation,
} from "@/lib/utils/wind";

const SIZE = 260;
const CENTER = SIZE / 2;
const RING_R = 86;
const LABEL_R = 104;
const TICK_OUTER = 86;

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

function useCompassRotation(degrees: number) {
  const [rotation, setRotation] = useState(() => windArrowRotation(degrees));
  const prev = useRef(rotation);

  useEffect(() => {
    const next = nextArrowRotation(prev.current, degrees);
    prev.current = next;
    setRotation(next);
  }, [degrees]);

  return rotation;
}

function CompassRing() {
  const ticks = [];
  for (let angle = 0; angle < 360; angle += 30) {
    const cardinal = angle % 90 === 0;
    const len = cardinal ? 11 : 7;
    const inner = polar(angle, TICK_OUTER - len);
    const outer = polar(angle, TICK_OUTER);
    ticks.push(
      <line
        key={angle}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={cardinal ? 2.4 : 1.6}
        opacity={cardinal ? 0.9 : 0.5}
      />
    );
  }

  const labels = [];
  const cardinals: Record<number, string> = { 0: "N", 90: "O", 180: "Z", 270: "W" };
  for (let angle = 0; angle < 360; angle += 30) {
    const pos = polar(angle, LABEL_R);
    const cardinal = cardinals[angle];
    labels.push(
      <text
        key={angle}
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={
          cardinal
            ? "fill-foreground text-[13px] font-bold"
            : "fill-surface-muted text-[10px] font-medium"
        }
      >
        {cardinal ?? angle}
      </text>
    );
  }

  return (
    <g>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RING_R + 10}
        fill="currentColor"
        className="text-accent-weather"
        opacity="0.07"
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RING_R}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-accent-weather"
        opacity="0.9"
      />
      <g className="text-accent-weather/80">{ticks}</g>
      {labels}
    </g>
  );
}

function RimPointer({
  rotation,
  kind,
}: {
  rotation: number;
  kind: "realtime" | "sustained";
}) {
  const sustained = kind === "sustained";
  const tipY = CENTER - RING_R + (sustained ? 14 : 20);
  const baseY = CENTER - RING_R - (sustained ? 4 : 6);
  const wing = sustained ? 6 : 10;

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
        points={`${CENTER},${tipY} ${CENTER - wing},${baseY} ${CENTER + wing},${baseY}`}
        fill={sustained ? "var(--color-surface-raised)" : "currentColor"}
        stroke="currentColor"
        strokeWidth={sustained ? 2.2 : 0.5}
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
  const realtimeRot = useCompassRotation(realtimeDeg);
  const sustainedRot = useCompassRotation(sustainedDeg);
  const dirLabel = getWindDirection(realtimeDeg);

  return (
    <div
      className="relative mx-auto aspect-square w-[9rem] sm:w-[11.5rem]"
      role="img"
      aria-label={`Windrichting ${Math.round(realtimeDeg)} graden ${dirLabel}`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible" aria-hidden>
        <CompassRing />
        <RimPointer rotation={sustainedRot} kind="sustained" />
        <RimPointer rotation={realtimeRot} kind="realtime" />
      </svg>
      <div className="pointer-events-none absolute inset-[18%] flex flex-col items-center justify-center rounded-full text-center">
        <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
          {Math.round(realtimeDeg)}°
        </span>
        <span className="mt-1 text-sm font-semibold tracking-wide text-accent-export">
          {dirLabel}
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
    <StationCard title="Wind">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-3">
        <div className="min-w-0">
          <Metric label="Wind" value={windSpeed.toFixed(1)} unit="km/u" accent="weather" />
          <DailyRange
            max={data.maxdailywind_kmh}
            maxTime={data.maxdailywind_time}
            unit="km/u"
            layout="stack"
          />
        </div>
        <WindCompass data={data} />
        <div className="min-w-0 text-right">
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
            layout="stack"
          />
        </div>
      </div>
      <p className="text-caption mt-3 text-center text-surface-muted">
        10 min {sustainedSpeed.toFixed(1)} km/u · {getWindDirection(sustainedDir ?? 0)}
      </p>
      <p className="text-caption mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-surface-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-accent-weather"
            aria-hidden
          />
          Real-time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-accent-export"
            aria-hidden
          />
          10 min
        </span>
      </p>
    </StationCard>
  );
}
