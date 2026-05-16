import type { GetijItem } from "@/lib/api/types";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "./day-label";

export interface TidePoint {
  time: Date;
  heightM: number;
}

const TZ = "Europe/Amsterdam";
const MAX_DELTA_HOURS = 0.5;

/** Parabolic vertex offset (hours) from center sample; 0 if denominator ~0. */
export function parabolicVertexOffsetHours(
  hPrev: number,
  hCur: number,
  hNext: number
): number {
  const denom = hPrev - 2 * hCur + hNext;
  if (Math.abs(denom) < 1e-6) return 0;
  const delta = (hPrev - hNext) / (2 * denom);
  return Math.max(-MAX_DELTA_HOURS, Math.min(MAX_DELTA_HOURS, delta));
}

/** Height at parabola vertex (x = delta from center hour). */
export function parabolicVertexHeight(
  hPrev: number,
  hCur: number,
  hNext: number,
  deltaHours: number
): number {
  const a = (hPrev + hNext) / 2 - hCur;
  const b = (hNext - hPrev) / 2;
  return a * deltaHours * deltaHours + b * deltaHours + hCur;
}

/** Local maxima = HW, local minima = LW with parabolic sub-hour refinement. */
export function extractExtremes(points: TidePoint[]): GetijItem[] {
  if (points.length < 3) return [];

  const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
  const extremes: GetijItem[] = [];

  for (let i = 1; i < sorted.length - 1; i++) {
    const hPrev = sorted[i - 1].heightM;
    const hCur = sorted[i].heightM;
    const hNext = sorted[i + 1].heightM;

    if (hCur > hPrev && hCur >= hNext) {
      extremes.push(refinedItem("HW", sorted[i], hPrev, hCur, hNext));
    } else if (hCur < hPrev && hCur <= hNext) {
      extremes.push(refinedItem("LW", sorted[i], hPrev, hCur, hNext));
    }
  }

  return extremes;
}

function refinedItem(
  type: "HW" | "LW",
  center: TidePoint,
  hPrev: number,
  hCur: number,
  hNext: number
): GetijItem {
  const deltaHours = parabolicVertexOffsetHours(hPrev, hCur, hNext);
  const at = center.time.getTime() + deltaHours * 3600_000;
  const heightM = parabolicVertexHeight(hPrev, hCur, hNext, deltaHours);
  const time = new Date(at);

  const tijd = time.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

  return {
    type,
    tijd,
    hoogte: heightM.toFixed(2),
    dagLabel: dagLabelAmsterdam(time),
    dagKey: dagKeyAmsterdam(time),
    at,
  };
}
