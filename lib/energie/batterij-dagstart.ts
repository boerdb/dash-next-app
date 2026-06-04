import type { BatterijLive } from "@/lib/homewizard/battery";
import type { EnergieDagstart } from "./dagstart";

export function amsterdamHourBucket(d = new Date()): string {
  const s = d.toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const [date, time] = s.split(" ");
  const hour = time?.slice(0, 2) ?? "00";
  return `${date} ${hour}`;
}

export function buildBatteryStarts(
  batterijen: BatterijLive[]
): Record<string, { import_start: number; export_start: number }> {
  const out: Record<string, { import_start: number; export_start: number }> = {};
  for (const b of batterijen) {
    if (!b.bereikbaar || b.import_start == null || b.export_start == null) continue;
    out[b.id] = {
      import_start: b.import_start,
      export_start: b.export_start,
    };
  }
  return out;
}

export function applyBatteryDagstartTotals(
  batterijen: BatterijLive[],
  start: EnergieDagstart
): BatterijLive[] {
  const starts = start.batterijen ?? {};
  return batterijen.map((b) => {
    const s = starts[b.id];
    if (!b.bereikbaar || !s) return b;
    const imp = Number(b.import_start ?? 0);
    const exp = Number(b.export_start ?? 0);
    return {
      ...b,
      vandaag_laden_kwh: round2(imp - s.import_start),
      vandaag_ontladen_kwh: round2(exp - s.export_start),
    };
  });
}

export function mergeDagstartBatteries(
  start: EnergieDagstart,
  batterijen: BatterijLive[]
): EnergieDagstart {
  const built = buildBatteryStarts(batterijen);
  if (Object.keys(built).length === 0) return start;
  return { ...start, batterijen: { ...start.batterijen, ...built } };
}

export function updateBatteryHourlySample(
  start: EnergieDagstart,
  vermogenW: number
): EnergieDagstart {
  const uurKey = amsterdamHourBucket();
  const batterij_uur = { ...(start.batterij_uur ?? {}), [uurKey]: Math.round(vermogenW) };
  const keys = Object.keys(batterij_uur).sort();
  while (keys.length > 24) {
    const oldest = keys.shift();
    if (oldest) delete batterij_uur[oldest];
  }
  return { ...start, batterij_uur };
}

export function buildBatteryHistorieFromDagstart(
  start: EnergieDagstart,
  liveW: number
): { labels: string[]; wattage: (number | null)[] } {
  const samples = start.batterij_uur ?? {};
  const keys = Object.keys(samples).sort();
  if (keys.length === 0) return { labels: [], wattage: [] };

  const labels = keys.map((k) => {
    const hour = k.split(" ")[1] ?? "00";
    return `${hour}:00`;
  });
  const wattage = keys.map((k) => samples[k] ?? null);
  const lastIdx = wattage.length - 1;
  if (lastIdx >= 0) wattage[lastIdx] = liveW;
  return { labels, wattage };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
