import type { GetijItem } from "@/lib/api/types";
import { allowedDayKeys } from "./allowed-days";
import { dagLabelForKey } from "./day-label";

/**
 * Filtert op actuele vandaag/morgen (Amsterdam) en zet labels opnieuw.
 * Nodig na middernacht wanneer gecachte API-responses nog gisteren als "Vandaag" tonen.
 */
export function normalizeGetijdenForDisplay(
  items: GetijItem[],
  now = new Date()
): GetijItem[] {
  if (!items.length) return [];

  const allowed = allowedDayKeys(now);
  const sorted = [...items].sort((a, b) => a.at - b.at);

  const visible = sorted
    .filter((e) => allowed.has(e.dagKey))
    .map((e) => ({
      ...e,
      dagLabel: dagLabelForKey(e.dagKey, now),
    }));

  if (!visible.length) return visible;

  const first = visible[0]!;
  if (first.vorige_hoogte_db) return visible;

  const prev = [...sorted].reverse().find((e) => e.at < first.at);
  if (!prev) return visible;

  return [{ ...first, vorige_hoogte_db: prev.hoogte }, ...visible.slice(1)];
}
