/** Basiskleur-presets voor Hue (xy of ct via bridge API v1). */

export type HueColorPreset =
  | "red"
  | "orange"
  | "yellow"
  | "blue"
  | "warm_white"
  | "cool_white";

export interface HueLightCapabilities {
  color: boolean;
  ct: boolean;
}

export const HUE_COLOR_PRESETS: {
  value: HueColorPreset;
  label: string;
  swatch: string;
  chromatic: boolean;
}[] = [
  { value: "red", label: "Rood", swatch: "#ef4444", chromatic: true },
  { value: "orange", label: "Oranje", swatch: "#f97316", chromatic: true },
  { value: "yellow", label: "Geel", swatch: "#eab308", chromatic: true },
  { value: "blue", label: "Blauw", swatch: "#3b82f6", chromatic: true },
  { value: "warm_white", label: "Warm wit", swatch: "#fcd34d", chromatic: false },
  { value: "cool_white", label: "Koel wit", swatch: "#e0f2fe", chromatic: false },
];

const XY: Record<Exclude<HueColorPreset, "warm_white" | "cool_white">, [number, number]> = {
  red: [0.675, 0.322],
  orange: [0.556, 0.408],
  yellow: [0.509, 0.42],
  blue: [0.167, 0.04],
};

const CT: Record<"warm_white" | "cool_white", number> = {
  warm_white: 454,
  cool_white: 153,
};

export function capabilitiesFromType(type: string): HueLightCapabilities {
  const t = type.toLowerCase();
  if (t.includes("extended color") || t === "color light") {
    return { color: true, ct: true };
  }
  if (t.includes("color temperature") || t.includes("white ambiance")) {
    return { color: false, ct: true };
  }
  return { color: false, ct: false };
}

/** Presets die op deze lamp werken. */
export function presetsForCapabilities(cap: HueLightCapabilities): HueColorPreset[] {
  const out: HueColorPreset[] = [];
  if (cap.color) out.push("red", "orange", "yellow", "blue");
  if (cap.ct || cap.color) out.push("warm_white", "cool_white");
  return out;
}

export function colorLabel(preset: HueColorPreset | undefined | null): string | null {
  if (!preset) return null;
  return HUE_COLOR_PRESETS.find((p) => p.value === preset)?.label ?? preset;
}

export function canApplyPreset(
  preset: HueColorPreset,
  cap: HueLightCapabilities,
): boolean {
  return presetsForCapabilities(cap).includes(preset);
}

/** Voeg xy of ct toe aan Hue state-body; sla over als lamp het niet ondersteunt. */
export function appendColorToState(
  body: Record<string, unknown>,
  preset: HueColorPreset | undefined,
  cap: HueLightCapabilities,
): void {
  if (!preset || !canApplyPreset(preset, cap)) return;

  if (preset === "warm_white" || preset === "cool_white") {
    if (cap.ct) {
      body.ct = CT[preset];
      return;
    }
    // Fallback op xy voor full-color zonder ct-vlag
    if (cap.color) {
      body.xy = preset === "warm_white" ? [0.457, 0.41] : [0.314, 0.337];
    }
    return;
  }

  if (cap.color) {
    body.xy = XY[preset];
  }
}

export interface HueLightStateInput {
  on?: boolean;
  /** Hue-bereik 1–254. */
  bri?: number;
  color?: HueColorPreset;
}

/** Bouw PUT /lights/{id}/state body. */
export function buildHueStateBody(
  input: HueLightStateInput,
  cap: HueLightCapabilities,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.on !== undefined) body.on = input.on;
  if (input.bri !== undefined) {
    body.bri = Math.max(1, Math.min(254, Math.round(input.bri)));
  }
  appendColorToState(body, input.color, cap);
  return body;
}
