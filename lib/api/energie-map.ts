import { aggregateBatterijen } from "@/lib/homewizard/battery";
import type { EnergieApiRaw, EnergieLive } from "./types";

export function mapEnergieLive(data: EnergieApiRaw): EnergieLive {
  const batterijen = data.batterijen ?? [];
  const groep = data.batterij_groep ?? null;
  const { vermogen_totaal, soc_gemiddeld } = aggregateBatterijen(
    batterijen,
    groep
  );

  return {
    stroom_nu: Number(data.active_power_w ?? 0),
    tarief: Number(data.active_tariff ?? 0),
    stroom_vandaag_in: data.vandaag_stroom_in_kwh ?? 0,
    stroom_vandaag_uit: data.vandaag_stroom_out_kwh ?? 0,
    gas_vandaag: data.vandaag_gas_m3 ?? 0,
    water_vandaag: data.vandaag_water_l ?? 0,
    water_actueel: Number(data.active_liter_lpm ?? 0),
    batterijen,
    batterij_groep: groep,
    batterij_vermogen_totaal: vermogen_totaal,
    batterij_soc_gemiddeld: soc_gemiddeld,
    batterij_hint: data.batterij_hint ?? null,
  };
}
