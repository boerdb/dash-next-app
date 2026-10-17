/** Hisense ConnectLife — was-droogcombinatie. Koppeling volgt; dit is het statusmodel. */

export interface HisenseAppliance {
  brand: "Hisense";
  /** Officiële typenummer (Benelux). */
  model: "WD5I1245BBRH/BLX";
  kind: "was-droogcombinatie";
  color: "zwart";
  washCapacityKg: number;
  dryCapacityKg: number;
  /** Maximaal centrifugetoerental volgens het Hisense-productblad. */
  spinRpm: number;
  powerW: number;
  energyClassWash: "A";
  energyClassDry: "A";
  dryerType: "warmtepomp";
  features: readonly string[];
}

export type HisenseRunState =
  | "offline"
  | "off"
  | "standby"
  | "delayed"
  | "running"
  | "paused"
  | "finished"
  | "error";

/** Wassen, drogen, of beide in één cyclus. */
export type HisenseCycleMode = "wash" | "dry" | "wash_dry";

export type HisenseDoor = "open" | "closed" | "locked";

/** Live cyclus. Velden blijven leeg tot ConnectLife status levert. */
export interface HisenseCycle {
  state: HisenseRunState;
  program: string | null;
  phase: string | null;
  mode: HisenseCycleMode | null;
  remainingMinutes: number | null;
  door: HisenseDoor | null;
  childLock: boolean | null;
}

export interface HisenseStatus {
  linked: boolean;
  appliance: HisenseAppliance;
  cycle: HisenseCycle | null;
  notice: string | null;
}
