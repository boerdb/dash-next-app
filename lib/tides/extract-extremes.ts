import type { GetijItem } from "@/lib/api/types";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "./day-label";

export interface TidePoint {
  time: Date;
  heightM: number;
}

/** Local maxima = HW, local minima = LW (hourly or finer series). */
export function extractExtremes(points: TidePoint[]): GetijItem[] {
  if (points.length < 3) return [];

  const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
  const extremes: GetijItem[] = [];

  for (let i = 1; i < sorted.length - 1; i++) {
    const prev = sorted[i - 1].heightM;
    const cur = sorted[i].heightM;
    const next = sorted[i + 1].heightM;

    if (cur > prev && cur >= next) {
      extremes.push(toItem("HW", sorted[i]));
    } else if (cur < prev && cur <= next) {
      extremes.push(toItem("LW", sorted[i]));
    }
  }

  return extremes;
}

function toItem(type: "HW" | "LW", point: TidePoint): GetijItem {
  const tijd = point.time.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  return {
    type,
    tijd,
    hoogte: point.heightM.toFixed(2),
    dagLabel: dagLabelAmsterdam(point.time),
    dagKey: dagKeyAmsterdam(point.time),
    at: point.time.getTime(),
  };
}
