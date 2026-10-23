import type { PrecipForecastSlot } from "@/lib/api/types";

/** Vanaf deze hoeveelheid per uur telt een uur als nat (Open-Meteo rondt op 0,1 mm). */
const WET_MM = 0.1;

function formatMm(mm: number): string {
  return mm.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Eén zin boven de grafiek: wanneer de regen begint (of dat het droog blijft)
 * en hoeveel er de komende 24 uur valt. Slots beginnen bij het huidige uur.
 */
export function summarizePrecipForecast(slots: PrecipForecastSlot[], hours: number): string {
  const firstWet = slots.findIndex((s) => s.precipitationMm >= WET_MM);
  if (firstWet < 0) return `Komende ${hours} uur droog`;

  const total24 = slots.slice(0, 24).reduce((sum, s) => sum + Math.max(0, s.precipitationMm), 0);
  const start = firstWet === 0 ? "Nu regen" : `Droog tot ${slots[firstWet].label}`;
  if (firstWet >= 24 || total24 < WET_MM) return start;
  return `${start} · ${formatMm(total24)} mm komende 24 uur`;
}
