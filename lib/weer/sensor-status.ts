import type { WeerLive } from "@/lib/api/types";
import { collectSensorBatteries } from "@/lib/weer/sensor-battery";

function fieldPresent(data: WeerLive, key: string): boolean {
  const v = data[key];
  return v !== undefined && v !== "";
}

export function hasLightningSensor(data: WeerLive): boolean {
  return (
    fieldPresent(data, "wh57batt") ||
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

export function hasWh25Secondary(data: WeerLive): boolean {
  return data.temp2_c != null || fieldPresent(data, "humidity2");
}

export function hasSensorExtras(data: WeerLive): boolean {
  return (
    hasLightningSensor(data) ||
    hasWs90Sensor(data) ||
    hasWh25Secondary(data) ||
    collectSensorBatteries(data).length > 0
  );
}
