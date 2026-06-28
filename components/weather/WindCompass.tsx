"use client";

import { ArrowUp } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import {
  getWindDirection,
  resolveWindDegrees,
  windArrowRotation,
} from "@/lib/utils/wind";
import { Card, CardContent } from "@/components/ui/card";

interface WindCompassProps {
  data: WeerLive;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RING_R = 86;

function CompassTicks() {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const angle = i * 5;
    const major = angle % 45 === 0;
    const len = major ? 11 : 5;
    const rad = (angle * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    ticks.push(
      <line
        key={i}
        x1={CENTER + RING_R * sin}
        y1={CENTER - RING_R * cos}
        x2={CENTER + (RING_R - len) * sin}
        y2={CENTER - (RING_R - len) * cos}
        stroke="currentColor"
        strokeWidth={major ? 2 : 1}
        strokeLinecap="round"
        opacity={major ? 0.75 : 0.3}
      />
    );
  }
  return <g className="text-cyan-400">{ticks}</g>;
}

/**
 * Ronde windmeter (Ecowitt-stijl): de naald wijst naar waar de wind vandaan
 * komt (meteorologisch FROM), dus 296° = WNW staat linksboven.
 */
export function WindCompass({ data }: WindCompassProps) {
  const realtimeDeg =
    data.winddir != null && !Number.isNaN(Number(data.winddir))
      ? Number(data.winddir)
      : resolveWindDegrees(data);
  const rotation = windArrowRotation(realtimeDeg);

  const windSpeed = Number(data.windspeed_kmh ?? data.windspd_avg10m_kmh ?? 0);
  const windAvg = Number(data.windspd_avg10m_kmh ?? 0);
  const windGust = Number(data.windgust_kmh ?? 0);
  const maxGust = Number(data.maxdailygust_kmh ?? 0);

  return (
    <Card variant="weather" className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="text-center">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-surface-muted">
              Wind
            </p>
            <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-foreground sm:text-3xl">
              {windSpeed.toFixed(1)}
            </p>
            <p className="text-[0.6rem] text-surface-muted">km/u</p>
            <p className="mt-2 text-[0.65rem] tabular-nums text-surface-muted">
              Gem. 10 min {windAvg.toFixed(1)}
            </p>
          </div>

          <div className="relative mx-auto aspect-square w-[140px] sm:w-[190px]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-cyan-400/25"
              />
              <CompassTicks />
              <g
                transform={`rotate(${rotation} ${CENTER} ${CENTER})`}
                style={{ transition: "transform 0.7s ease" }}
                className="text-sky-400"
              >
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={CENTER}
                  y2={CENTER - RING_R + 18}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                <polygon
                  points={`${CENTER},${CENTER - RING_R - 1} ${CENTER - 8},${CENTER - RING_R + 20} ${CENTER + 8},${CENTER - RING_R + 20}`}
                  fill="currentColor"
                />
              </g>
              <circle cx={CENTER} cy={CENTER} r="3" className="text-sky-400" fill="currentColor" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[0.5rem] font-medium uppercase tracking-[0.18em] text-surface-muted">
                Real-Time
              </span>
              <span className="text-2xl font-bold leading-none tabular-nums text-foreground sm:text-3xl">
                {Math.round(realtimeDeg)}
                <span className="align-top text-sm sm:text-base">°</span>
              </span>
              <span className="mt-1 text-sm font-semibold text-emerald-400">
                {getWindDirection(realtimeDeg)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-surface-muted">
              Stoot
            </p>
            <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-foreground sm:text-3xl">
              {windGust.toFixed(1)}
            </p>
            <p className="text-[0.6rem] text-surface-muted">km/u</p>
            <p className="mt-2 inline-flex items-center gap-0.5 text-[0.65rem] tabular-nums text-orange-400">
              <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
              {maxGust.toFixed(1)} vandaag
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
