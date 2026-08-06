import type { HueRuleAction } from "@/lib/hue/types";

export const HUE_ACTIONS: {
  value: HueRuleAction;
  label: string;
  needsBrightness: boolean;
}[] = [
  { value: "on", label: "Aan", needsBrightness: true },
  { value: "off", label: "Uit", needsBrightness: false },
  { value: "dim", label: "Dimmen", needsBrightness: true },
];
