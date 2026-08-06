import type { HueLight } from "@/lib/hue/types";

/** Lampstatus vóór een alarm-regel afging. */
export interface HueLightStateSnapshot {
  on: boolean;
  bri: number | null;
  xy: [number, number] | null;
  ct: number | null;
}

export function snapshotFromLight(light: HueLight): HueLightStateSnapshot {
  return {
    on: light.state.on,
    bri: light.state.bri,
    xy: light.state.xy ?? null,
    ct: light.state.ct ?? null,
  };
}

export function describeSnapshot(s: HueLightStateSnapshot): string {
  if (!s.on) return "uit";
  const pct = s.bri != null ? Math.round((s.bri / 254) * 100) : null;
  if (s.xy) return pct != null ? `aan ${pct}% (kleur)` : "aan (kleur)";
  if (s.ct) return pct != null ? `aan ${pct}% (wit)` : "aan (wit)";
  return pct != null ? `aan ${pct}%` : "aan";
}
