import "server-only";
import { env } from "@/lib/env.server";
import { waterMeterstandM3 } from "@/lib/energie/water-meter-stand";

export {
  formatWaterMeterstandOpgave,
  waterMeterstandM3,
} from "@/lib/energie/water-meter-stand";

/** Fysieke meterstand = offset (opgave bij plaatsing) + HomeWizard-telling. */
export function computeWaterMeterstandM3(
  totalLiterM3: number | string | undefined | null,
  hwOffsetM3: number | string | undefined | null = 0
): number | null {
  const sensor = Number(totalLiterM3);
  if (!Number.isFinite(sensor)) return null;

  const hw = Number(hwOffsetM3);
  const extra = Number.isFinite(hw) ? hw : 0;
  return waterMeterstandM3(env.WATER_METER_OFFSET_M3, sensor, extra);
}
