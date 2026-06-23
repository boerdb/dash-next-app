export type EcowittBatteryKind = "flag" | "bars" | "voltage";

export interface SensorBatteryStatus {
  label: string;
  state: "ok" | "low" | "offline";
  detail: string;
}

function num(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** WH65 / WH25 / WH80: 0 = OK, 1 = laag. WH57: 1–5 bars (≤1 = laag). WH90: spanning × 0,02 V. */
export function formatEcowittBattery(
  raw: string | number | undefined,
  kind: EcowittBatteryKind,
  label: string
): SensorBatteryStatus | null {
  const n = num(raw);
  if (n === null) return null;

  if (kind === "flag") {
    const low = n >= 1;
    return {
      label,
      state: low ? "low" : "ok",
      detail: low ? "Laag" : "OK",
    };
  }

  if (kind === "bars") {
    const low = n <= 1;
    return {
      label,
      state: low ? "low" : "ok",
      detail: low ? "Laag" : `${Math.round(n)}/5`,
    };
  }

  const volts = Math.round(n * 0.02 * 100) / 100;
  const low = volts < 2.5;
  return {
    label,
    state: low ? "low" : "ok",
    detail: `${volts} V`,
  };
}

export interface WeerBatteryFields {
  wh65batt?: string | number;
  wh25batt?: string | number;
  wh57batt?: string | number;
  wh90batt?: string | number;
  batt2?: string | number;
}

/** WH57 bliksemsensor — enige batterij in de bliksem-kaart. */
export function getLightningBattery(
  data: Pick<WeerBatteryFields, "wh57batt">
): SensorBatteryStatus | null {
  return formatEcowittBattery(data.wh57batt, "bars", "Bliksem");
}
