/** Per-fase live data van de HomeWizard P1 (v1 of v2 veldnamen). */
export interface P1PhaseRaw {
  active_power_l1_w?: number;
  active_power_l2_w?: number;
  active_power_l3_w?: number;
  active_voltage_l1_v?: number;
  active_voltage_l2_v?: number;
  active_voltage_l3_v?: number;
  active_current_l1_a?: number;
  active_current_l2_a?: number;
  active_current_l3_a?: number;
  power_l1_w?: number;
  power_l2_w?: number;
  power_l3_w?: number;
  voltage_l1_v?: number;
  voltage_l2_v?: number;
  voltage_l3_v?: number;
  current_l1_a?: number;
  current_l2_a?: number;
  current_l3_a?: number;
}

export interface FaseUnit {
  vermogen_w: number;
  spanning_v: number | null;
  stroom_a: number | null;
}

export interface FaseLive {
  l1: FaseUnit | null;
  l2: FaseUnit | null;
  l3: FaseUnit | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parsePhase(
  power: number | undefined,
  voltage: number | undefined,
  current: number | undefined
): FaseUnit | null {
  if (power == null && voltage == null && current == null) return null;
  return {
    vermogen_w: Math.round(Number(power ?? 0)),
    spanning_v: voltage != null ? round1(Number(voltage)) : null,
    stroom_a: current != null ? round1(Number(current)) : null,
  };
}

/** Map P1 raw naar per-fase live data; null als geen fasevelden aanwezig. */
export function mapP1Phases(raw: P1PhaseRaw): FaseLive | null {
  const l1 = parsePhase(
    raw.active_power_l1_w ?? raw.power_l1_w,
    raw.active_voltage_l1_v ?? raw.voltage_l1_v,
    raw.active_current_l1_a ?? raw.current_l1_a
  );
  const l2 = parsePhase(
    raw.active_power_l2_w ?? raw.power_l2_w,
    raw.active_voltage_l2_v ?? raw.voltage_l2_v,
    raw.active_current_l2_a ?? raw.current_l2_a
  );
  const l3 = parsePhase(
    raw.active_power_l3_w ?? raw.power_l3_w,
    raw.active_voltage_l3_v ?? raw.voltage_l3_v,
    raw.active_current_l3_a ?? raw.current_l3_a
  );

  if (!l1 && !l2 && !l3) return null;
  return { l1, l2, l3 };
}

export function faseCount(fases: FaseLive): number {
  return [fases.l1, fases.l2, fases.l3].filter(Boolean).length;
}
