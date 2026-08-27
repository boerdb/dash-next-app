import { cn } from "@/lib/utils";

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Extreme({
  label,
  value,
  time,
  unit,
  decimals,
  tone,
}: {
  label: string;
  value: number;
  time?: string | null;
  unit?: string;
  decimals: number;
  tone: "high" | "low";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[0.7rem] font-medium uppercase tracking-wide text-surface-muted tabular-nums">
        {time || "—"} {label}
      </p>
      <p
        className={cn(
          "tabular-nums text-base font-bold leading-none",
          tone === "high" ? "text-accent-energy" : "text-accent-weather"
        )}
      >
        {value.toFixed(decimals)}
        {unit?.startsWith("°") ? (
          "°"
        ) : unit ? (
          <span className="ml-0.5 text-[0.7em] font-normal text-surface-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

/** Min/max van vandaag: tijd + label links, waarde rechts. */
export function DailyRange({
  min,
  max,
  minTime,
  maxTime,
  unit,
  decimals = 1,
  align = "left",
  className,
}: {
  min?: unknown;
  max?: unknown;
  minTime?: string | null;
  maxTime?: string | null;
  unit?: string;
  decimals?: number;
  align?: "left" | "right";
  className?: string;
}) {
  const minN = finiteNumber(min);
  const maxN = finiteNumber(max);
  if (minN === null && maxN === null) return null;

  const maxOnly = maxN !== null && minN === null;

  return (
    <div
      className={cn("mt-2.5 space-y-1.5", align === "right" && "text-right", className)}
      aria-label="Dagrecord"
    >
      {minN !== null ? (
        <Extreme
          label="MIN"
          value={minN}
          time={minTime}
          unit={unit}
          decimals={decimals}
          tone="low"
        />
      ) : null}
      {maxN !== null ? (
        <Extreme
          label={maxOnly ? "PIEK" : "MAX"}
          value={maxN}
          time={maxTime}
          unit={unit}
          decimals={decimals}
          tone="high"
        />
      ) : null}
    </div>
  );
}
