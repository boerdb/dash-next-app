import "server-only";
import { setLightState } from "@/lib/hue/client";
import type { HueColorPreset, HueLightStateInput } from "@/lib/hue/colors";
import type { HueLight, HueRule, HueSettings } from "@/lib/hue/types";

function briFromPercent(percent: number): number {
  return Math.max(1, Math.min(254, Math.round((percent / 100) * 254)));
}

export async function applyHueLightAction(
  settings: HueSettings,
  light: HueLight | undefined,
  lightId: string,
  action: HueRule["action"],
  brightness?: number,
  color?: HueColorPreset,
): Promise<void> {
  const lightType = light?.type ?? "";
  const bri = briFromPercent(brightness ?? 100);

  let state: HueLightStateInput;
  switch (action) {
    case "off":
      state = { on: false };
      break;
    case "on":
    case "dim":
      state = { on: true, bri, color };
      break;
  }

  await setLightState(settings, lightId, state, lightType);
}
