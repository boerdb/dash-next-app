import type { EnergieApiRaw } from "@/lib/api/types";
import type { BatterijLive } from "@/lib/homewizard/battery";
import { applyBatteryDagstartTotals } from "@/lib/energie/batterij-dagstart";
import type { EnergieDagstart } from "@/lib/energie/dagstart";

export interface DagTotalenKwh {
  net_in_kwh: number;
  net_uit_kwh: number;
  batterij_kwh: number;
}

export function computeDagTotalenKwh(
  start: EnergieDagstart,
  data: EnergieApiRaw,
  batterijen: BatterijLive[]
): DagTotalenKwh {
  const importKwh = Number(data.total_power_import_kwh ?? 0);
  const exportKwh = Number(data.total_power_export_kwh ?? 0);
  const net_in_kwh = round2(importKwh - start.import_start);
  const net_uit_kwh = round2(exportKwh - start.export_start);

  const withBat = applyBatteryDagstartTotals(batterijen, start);
  const batterij_kwh = round2(
    withBat.reduce((s, b) => s + Number(b.vandaag_ontladen_kwh ?? 0), 0)
  );

  return { net_in_kwh, net_uit_kwh, batterij_kwh };
}

/** Live vandaag-totalen (zelfde bron als maandgrafiek). */
export function dagTotalenFromVandaag(
  data: Pick<
    EnergieApiRaw,
    "vandaag_stroom_in_kwh" | "vandaag_stroom_out_kwh" | "batterijen"
  >
): DagTotalenKwh {
  const batterij_kwh = round2(
    (data.batterijen ?? []).reduce(
      (s, b) => s + Number(b.vandaag_ontladen_kwh ?? 0),
      0
    )
  );
  return {
    net_in_kwh: round2(Number(data.vandaag_stroom_in_kwh ?? 0)),
    net_uit_kwh: round2(Number(data.vandaag_stroom_out_kwh ?? 0)),
    batterij_kwh,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
