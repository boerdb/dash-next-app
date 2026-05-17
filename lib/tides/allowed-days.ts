import { dagKeyAmsterdam } from "./day-label";

/** Vandaag en morgen (Amsterdam) voor getijweergave. */
export function allowedDayKeys(): Set<string> {
  const today = dagKeyAmsterdam(new Date());
  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  return new Set([today, dagKeyAmsterdam(morgen)]);
}
