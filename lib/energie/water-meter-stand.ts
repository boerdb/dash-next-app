export function waterMeterstandM3(
  offsetM3: number,
  totalLiterM3: number,
  hwOffsetM3 = 0
): number {
  return round1(offsetM3 + hwOffsetM3 + totalLiterM3);
}

/** Hele m³ voor opgave bij waterleidingmaatschappij. */
export function formatWaterMeterstandOpgave(m3: number): string {
  return String(Math.round(m3));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
