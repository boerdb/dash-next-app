"use client";

import type { AstronomieApi } from "@/lib/api/types";

interface SunMoonArcProps {
  astro: AstronomieApi;
}

const W = 320;
const H = 130;
const CX = W / 2;
const BASE_Y = 108;
const R = 88;

function sunPoint(progress: number) {
  const angle = Math.PI * (1 - progress);
  return {
    x: CX + R * Math.cos(angle),
    y: BASE_Y - R * Math.sin(angle),
  };
}

const MOON_DARK = "#0f172a";
const MOON_LIGHT = "#e2e8f0";

/** Zichtbaar verlicht deel bij twee gelijke cirkels (donkere cirkel bovenop). */
function visibleLitArea(separation: number, r: number): number {
  if (separation <= 0) return 0;
  if (separation >= 2 * r) return 1;
  const x = separation / (2 * r);
  const overlap =
    2 * r * r * Math.acos(x) - (separation / 2) * Math.sqrt(4 * r * r - separation * separation);
  return 1 - overlap / (Math.PI * r * r);
}

/** Afstand tussen maan- en schaduwmiddelpunt voor gewenst verlicht percentage. */
function separationForFraction(fraction: number, r: number): number {
  const target = Math.min(1, Math.max(0, fraction));
  if (target <= 0) return 0;
  if (target >= 1) return 2 * r;
  let lo = 0;
  let hi = 2 * r;
  for (let i = 0; i < 50; i++) {
    const d = (lo + hi) / 2;
    if (visibleLitArea(d, r) < target) lo = d;
    else hi = d;
  }
  return (lo + hi) / 2;
}

function moonShadowCx(fraction: number, r: number, waxing: boolean): number {
  const d = separationForFraction(fraction, r);
  return waxing ? r - d : r + d;
}

function MoonPhaseDisc({
  phase,
  fraction,
  size = 28,
}: {
  phase: number;
  fraction: number;
  size?: number;
}) {
  const waxing = phase < 0.5;
  const litPct = Math.round(fraction * 100);
  const r = size / 2;
  const clipId = `moon-clip-${size}-${waxing ? "w" : "n"}-${litPct}`;

  if (litPct < 3) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        aria-hidden
      >
        <circle cx={r} cy={r} r={r - 0.5} fill={MOON_DARK} />
      </svg>
    );
  }

  if (litPct > 97) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        aria-hidden
      >
        <circle cx={r} cy={r} r={r - 0.5} fill={MOON_LIGHT} />
      </svg>
    );
  }

  const shadowCx = moonShadowCx(fraction, r, waxing);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={r} cy={r} r={r - 0.5} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx={r} cy={r} r={r} fill={MOON_LIGHT} />
        <circle cx={shadowCx} cy={r} r={r} fill={MOON_DARK} />
      </g>
    </svg>
  );
}

export function SunMoonArc({ astro }: SunMoonArcProps) {
  const sunUp =
    !astro.sunBelowHorizon &&
    astro.sunProgress >= 0 &&
    astro.sunProgress <= 1;
  const sun = sunPoint(Math.max(0, Math.min(1, astro.sunProgress)));
  const arcPath = `M ${CX - R} ${BASE_Y} A ${R} ${R} 0 0 1 ${CX + R} ${BASE_Y}`;

  return (
    <div className="mx-auto mt-1 w-full max-w-[320px]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label={`Zonopkomst ${astro.sunriseLabel}, ${astro.daylightHoursLabel} daglicht, zonondergang ${astro.sunsetLabel}`}
      >
        <defs>
          <linearGradient id="sunArcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <path
          d={arcPath}
          fill="none"
          stroke="url(#sunArcGlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {sunUp && (
          <g transform={`translate(${sun.x}, ${sun.y})`}>
            <circle r="16" fill="#fbbf24" opacity="0.25" />
            <circle r="11" fill="#fde68a" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1={0}
                y1={-15}
                x2={0}
                y2={-19}
                stroke="#fde68a"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${deg})`}
                opacity={0.75}
              />
            ))}
          </g>
        )}

        {astro.period === "night" && (
          <g transform={`translate(${CX}, ${BASE_Y - 48})`}>
            <foreignObject x={-16} y={-16} width={32} height={32}>
              <div className="flex h-8 w-8 items-center justify-center">
                <MoonPhaseDisc
                  phase={astro.moon.phase}
                  fraction={astro.moon.fraction}
                  size={32}
                />
              </div>
            </foreignObject>
          </g>
        )}

        <text
          x={CX - R}
          y={BASE_Y + 14}
          textAnchor="start"
          fill="rgba(255,255,255,0.9)"
          fontSize="11"
          fontWeight="500"
        >
          ↑ {astro.sunriseLabel}
        </text>
        <text
          x={CX + R}
          y={BASE_Y + 14}
          textAnchor="end"
          fill="rgba(255,255,255,0.9)"
          fontSize="11"
          fontWeight="500"
        >
          {astro.sunsetLabel} ↓
        </text>
        <text
          x={CX}
          y={BASE_Y + 28}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize="10"
          fontWeight="500"
        >
          {astro.daylightHoursLabel} daglicht
        </text>
      </svg>

      <div className="mt-2 flex items-center justify-center gap-2.5 rounded-xl bg-black/25 px-3 py-2">
        <MoonPhaseDisc
          phase={astro.moon.phase}
          fraction={astro.moon.fraction}
          size={26}
        />
        <div className="text-left text-sm leading-tight">
          <p className="font-medium text-white">{astro.moon.label}</p>
          <p className="text-xs text-white/60">
            {astro.moon.illuminationPct}% verlicht
          </p>
        </div>
      </div>
    </div>
  );
}
