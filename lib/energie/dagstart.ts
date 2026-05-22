import type { EnergieApiRaw } from "@/lib/api/types";

export interface EnergieDagstart {
  date: string;
  import_start: number;
  export_start: number;
  gas_start: number;
  water_start: number;
}

export function todayAmsterdam(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function buildDagstartFromMeters(data: EnergieApiRaw): EnergieDagstart {
  return {
    date: todayAmsterdam(),
    import_start: Number(data.total_power_import_kwh ?? 0),
    export_start: Number(data.total_power_export_kwh ?? 0),
    gas_start: Number(data.total_gas_m3 ?? 0),
    water_start: Number(data.total_liter_m3 ?? 0),
  };
}

export function applyDagstartTotals(
  data: EnergieApiRaw,
  start: EnergieDagstart
): EnergieApiRaw {
  const importKwh = Number(data.total_power_import_kwh ?? 0);
  const exportKwh = Number(data.total_power_export_kwh ?? 0);
  const gasM3 = Number(data.total_gas_m3 ?? 0);
  const waterM3 = Number(data.total_liter_m3 ?? 0);

  return {
    ...data,
    vandaag_stroom_in_kwh: round2(importKwh - start.import_start),
    vandaag_stroom_out_kwh: round2(exportKwh - start.export_start),
    vandaag_gas_m3: round3(gasM3 - start.gas_start),
    vandaag_water_l: round0((waterM3 - start.water_start) * 1000),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round0(n: number): number {
  return Math.round(n);
}
