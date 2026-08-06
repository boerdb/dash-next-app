"use client";

import {
  HUE_COLOR_PRESETS,
  presetsForCapabilities,
  type HueColorPreset,
  type HueLightCapabilities,
} from "@/lib/hue/colors";

export function HueColorSelect({
  value,
  onChange,
  capabilities,
  allowNone = true,
  disabled,
  className = "tahoma-input",
}: {
  value: HueColorPreset | "";
  onChange: (v: HueColorPreset | "") => void;
  capabilities: HueLightCapabilities;
  allowNone?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const allowed = presetsForCapabilities(capabilities);
  if (allowed.length === 0) return null;

  const options = HUE_COLOR_PRESETS.filter((p) => allowed.includes(p.value));

  return (
    <select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange((e.target.value || "") as HueColorPreset | "")}
    >
      {allowNone ? <option value="">Geen kleur</option> : null}
      {options.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

export function HueColorSwatches({
  value,
  onChange,
  capabilities,
  disabled,
}: {
  value: HueColorPreset | "";
  onChange: (v: HueColorPreset) => void;
  capabilities: HueLightCapabilities;
  disabled?: boolean;
}) {
  const allowed = presetsForCapabilities(capabilities);
  const options = HUE_COLOR_PRESETS.filter((p) => allowed.includes(p.value));
  if (options.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {options.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          title={p.label}
          aria-label={p.label}
          aria-pressed={value === p.value}
          onClick={() => onChange(p.value)}
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-105 disabled:opacity-40"
          style={{
            backgroundColor: p.swatch,
            borderColor: value === p.value ? "var(--foreground)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}
