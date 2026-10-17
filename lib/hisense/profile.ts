import type { HisenseAppliance, HisenseStatus } from "@/lib/hisense/types";

/** Vaste gegevens van de WD5I1245BBRH/BLX. Live cyclus komt later via ConnectLife. */
export const WD5I1245BBRH: HisenseAppliance = {
  brand: "Hisense",
  model: "WD5I1245BBRH/BLX",
  kind: "was-droogcombinatie",
  color: "zwart",
  washCapacityKg: 12,
  dryCapacityKg: 8,
  spinRpm: 1430,
  powerW: 1900,
  energyClassWash: "A",
  energyClassDry: "A",
  dryerType: "warmtepomp",
  features: [
    "Warmtepomp",
    "AutoDose",
    "ConnectLife",
    "Stoom",
    "AI Super Wash & Dry",
    "Wash & Dry",
  ],
};

export function unlinkedStatus(): HisenseStatus {
  return {
    linked: false,
    appliance: WD5I1245BBRH,
    cycle: null,
    notice:
      "Nog niet gekoppeld. Programma, fase en resttijd verschijnen hier zodra ConnectLife is aangesloten.",
  };
}
