import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Extreme({
  value,
  time,
  unit,
  decimals,
  tone,
  layout,
  align,
}: {
  value: number;
  time?: string | null;
  unit?: string;
  decimals: number;
  tone: "high" | "low";
  layout: "row" | "stack";
  align: "left" | "right";
}) {
  const Icon = tone === "high" ? ArrowUp : ArrowDown;
  const valueEl = (
    <p
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums text-base font-bold leading-none",
        tone === "high" ? "text-accent-energy" : "text-accent-weather"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {value.toFixed(decimals)}
      {unit?.startsWith("°") ? (
        "°"
      ) : unit ? (
        <span className="ml-0.5 text-[0.7em] font-normal text-surface-muted">{unit}</span>
      ) : null}
    </p>
  );

  if (layout === "stack") {
    return (
      <div className={cn("space-y-0.5", align === "right" && "flex flex-col items-end")}>
        {valueEl}
        <p className="text-caption tabular-nums text-surface-muted">{time || "—"}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-caption tabular-nums text-surface-muted">{time || "—"}</p>
      {valueEl}
    </div>
  );
}

/** Dagrecord: max (oranje) boven min (blauw), met pijl en tijdstip. */
export function DailyRange({
  min,
  max,
  minTime,
  maxTime,
  unit,
  decimals = 1,
  align = "left",
  layout = "row",
  className,
}: {
  min?: unknown;
  max?: unknown;
  minTime?: string | null;
  maxTime?: string | null;
  unit?: string;
  decimals?: number;
  align?: "left" | "right";
  layout?: "row" | "stack";
  className?: string;
}) {
  const minN = finiteNumber(min);
  const maxN = finiteNumber(max);
  if (minN === null && maxN === null) return null;

  return (
    <div
      className={cn("mt-2.5 space-y-1.5", align === "right" && "text-right", className)}
      aria-label="Dagrecord"
    >
      {maxN !== null ? (
        <Extreme
          value={maxN}
          time={maxTime}
          unit={unit}
          decimals={decimals}
          tone="high"
          layout={layout}
          align={align}
        />
      ) : null}
      {minN !== null ? (
        <Extreme
          value={minN}
          time={minTime}
          unit={unit}
          decimals={decimals}
          tone="low"
          layout={layout}
          align={align}
        />
      ) : null}
    </div>
  );
}
