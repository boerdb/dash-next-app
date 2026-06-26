import type { WeerLive } from "@/lib/api/types";

function fieldPresent(data: WeerLive, key: string): boolean {
  const v = data[key];
  return v !== undefined && v !== "";
}

/** WH57 gekoppeld (wh57batt 1–5 in upload of gateway-API). */
export function isWh57Detected(data: WeerLive): boolean {
  const batt = data.wh57batt;
  if (batt === undefined || batt === "") return false;
  const n = Number(batt);
  return Number.isFinite(n) && n >= 1 && n <= 5;
}

export function hasLightningSensor(data: WeerLive): boolean {
  return (
    isWh57Detected(data) ||
    fieldPresent(data, "lightning") ||
    fieldPresent(data, "lightning_km") ||
    fieldPresent(data, "lightning_num")
  );
}

export function hasWs90Sensor(data: WeerLive): boolean {
  return (
    fieldPresent(data, "wh90batt") ||
    fieldPresent(data, "ws90cap_volt") ||
    fieldPresent(data, "ws90_voltage_v") ||
    fieldPresent(data, "dailyrain_piezo_mm") ||
    fieldPresent(data, "rainrate_piezo_mm") ||
    String(data.model ?? "").toUpperCase().includes("WS90")
  );
}

export function hasSensorExtras(data: WeerLive): boolean {
  return hasLightningSensor(data) || hasWs90Sensor(data);
}
