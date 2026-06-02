import { addCalendarDaysAmsterdam, dagKeyAmsterdam } from "./day-label";

/** Vandaag en morgen (Amsterdam) voor getijweergave. */
export function allowedDayKeys(now = new Date()): Set<string> {
  const today = dagKeyAmsterdam(now);
  const tomorrow = addCalendarDaysAmsterdam(now, 1);
  return new Set([today, tomorrow]);
}
