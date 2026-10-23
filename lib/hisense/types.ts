/** Hisense ConnectLife — was-droogcombinatie. Statusmodel voor de Was-tab. */

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

/** Live cyclus uit de ConnectLife-statusList. */
export interface HisenseCycle {
  state: HisenseRunState;
  program: string | null;
  phase: string | null;
  mode: HisenseCycleMode | null;
  remainingMinutes: number | null;
  door: HisenseDoor | null;
  childLock: boolean | null;
  spinRpm: number | null;
  temperature: string | null;
  /** Storingscode van de machine; null als er geen storing is. */
  errorCode: string | null;
}

export interface HisenseStatus {
  linked: boolean;
  appliance: HisenseAppliance;
  cycle: HisenseCycle | null;
  notice: string | null;
  /** Naam en featurecode zoals de ConnectLife-app ze kent. */
  nickname: string | null;
  featureCode: string | null;
  /** ISO-tijd van de laatste geslaagde cloud-uitlezing. */
  updatedAt: string | null;
}
