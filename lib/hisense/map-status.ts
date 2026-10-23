import type {
  HisenseCycle,
  HisenseCycleMode,
  HisenseDoor,
  HisenseRunState,
} from "@/lib/hisense/types";

/**
 * statusList (ConnectLife, apparaattype 025) → cyclus.
 *
 * Codes komen uit de datadictionaries van oyvindwe/connectlife-ha voor de
 * 1wj120-reeks (12 kg, o.a. was-droger WDSE1214). Ze verschillen per
 * featurecode; onbekende codes tonen we als nummer in plaats van te gokken.
 */

const MACHINE_STATUS: Record<number, HisenseRunState> = {
  0: "off",
  1: "standby",
  2: "running",
  3: "paused",
  4: "error",
};

const PHASE: Record<number, string> = {
  1: "Wegen",
  2: "Voorwas",
  3: "Wassen",
  4: "Spoelen",
  7: "Centrifugeren",
  8: "Drogen",
  10: "Klaar",
  11: "Wacht op start",
};

const PROGRAM: Record<number, string> = {
  1: "Katoen drogen",
  2: "Synthetisch drogen",
  4: "Opfrissen",
  5: "Allergiezorg",
  6: "Trommelreiniging",
  7: "Katoen",
  8: "Synthetisch",
  9: "Eco 40-60",
  10: "Wol",
  11: "Snel 15'",
  12: "Gemengd",
  14: "Centrifugeren",
  15: "Allergiezorg",
  16: "Babyzorg",
  18: "Sportkleding",
  19: "Dons",
  20: "Spoelen + centrifugeren",
  21: "Zijde / fijn",
  22: "Wassen + drogen 60'",
  24: "Overhemden",
  41: "Power 49'",
  42: "Auto",
  44: "Beddengoed",
  45: "Jeans",
  55: "Handwas",
};

/** Programma's die alleen drogen. */
const DRY_ONLY_PROGRAMS = new Set([1, 2]);

const SPIN_RPM: Record<number, number> = {
  6: 600,
  8: 800,
  10: 1000,
  12: 1200,
  14: 1400,
};

const TEMPERATURE: Record<number, string> = {
  0: "Koud",
  2: "20 °C",
  3: "30 °C",
  4: "40 °C",
  6: "60 °C",
  9: "90 °C",
};

function num(list: Record<string, string>, key: string): number | null {
  const raw = list[key];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function door(code: number | null, locked: boolean): HisenseDoor | null {
  if (code === 1) return "open";
  if (code === 3) return locked ? "locked" : "closed";
  return null;
}

function mode(programId: number | null, phase: number | null, list: Record<string, string>): HisenseCycleMode | null {
  if (programId == null || programId === 0) return null;
  if (DRY_ONLY_PROGRAMS.has(programId)) return "dry";
  if (programId === 22 || num(list, "DryingSwitch") === 1 || (phase === 8 && programId !== 0)) {
    return "wash_dry";
  }
  return "wash";
}

export function mapCycle(list: Record<string, string>, online: boolean): HisenseCycle {
  const machine = num(list, "machine_status");
  const phase = num(list, "Current_program_phase");
  const programId = num(list, "Selected_program_ID");
  const errorCode = num(list, "error_code");
  const remaining = num(list, "Selected_program_remaining_time_in_minutes");
  const delayHours = num(list, "DelayEndTime");
  const delayMinutes = num(list, "DelayEndTime_Minute");
  const childLock = num(list, "Child_lock");

  let state: HisenseRunState = online ? (machine != null ? MACHINE_STATUS[machine] ?? "standby" : "standby") : "offline";
  if (online && errorCode != null && errorCode !== 0) state = "error";
  else if (online && phase === 10 && state !== "running") state = "finished";
  else if (online && (phase === 11 || (delayHours ?? 0) + (delayMinutes ?? 0) > 0) && state !== "running") {
    state = "delayed";
  }

  const active = state === "running" || state === "paused" || state === "delayed";
  const phaseLabel =
    phase == null || phase === 0 ? null : (PHASE[phase] ?? `Fase ${phase}`);
  const programLabel =
    programId == null || state === "off" || state === "offline"
      ? null
      : (PROGRAM[programId] ?? `Programma ${programId}`);
  const spin = num(list, "Spin_speed_rpm");
  const temp = num(list, "temperature") ?? num(list, "Temperature");

  return {
    state,
    program: programLabel,
    phase: phaseLabel,
    mode: state === "off" || state === "offline" ? null : mode(programId, phase, list),
    remainingMinutes: active && remaining != null ? remaining : null,
    // Tijdens een cyclus zit de deur op slot; de API meldt dan alleen "dicht".
    door: online ? door(num(list, "Door_status"), state === "running" || state === "paused") : null,
    childLock: childLock == null ? null : childLock !== 0,
    spinRpm: spin == null || spin === 0 ? null : (SPIN_RPM[spin] ?? spin * 100),
    temperature: temp == null ? null : (TEMPERATURE[temp] ?? null),
    errorCode: errorCode != null && errorCode !== 0 ? String(errorCode) : null,
  };
}
