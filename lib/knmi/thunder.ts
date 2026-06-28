import type { KnmiWaarschuwingenApi } from "@/lib/api/types";

/** Is er nu een actieve KNMI-onweerwaarschuwing voor de provincie? */
export function hasActiveKnmiThunderWarning(
  data: KnmiWaarschuwingenApi | null | undefined
): boolean {
  if (!data) return false;
  return data.warnings.some(
    (w) => w.phenomenonId === "thunderstorm" && w.active === true
  );
}
