"use client";

import { Zap } from "lucide-react";
import type { EnergieLive, FaseLive, FaseUnit } from "@/lib/api/types";
import { faseCount } from "@/lib/homewizard/p1-phases";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PhasePanelProps {
  data: EnergieLive;
}

function powerColor(w: number): string {
  if (Math.abs(w) < 5) return "text-surface-muted";
  return w < 0 ? "text-emerald-400" : "text-amber-200";
}

function powerLabel(w: number): string {
  if (Math.abs(w) < 5) return "Rust";
  return w < 0 ? "Terug" : "Afname";
}

function PhaseUnit({
  name,
  unit,
}: {
  name: string;
  unit: FaseUnit;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-surface-inset p-3 text-center">
      <Zap className={cn("mx-auto h-5 w-5", powerColor(unit.vermogen_w))} />
      <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-surface-muted">
        {name}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          powerColor(unit.vermogen_w)
        )}
      >
        {Math.abs(unit.vermogen_w)}
        <span className="text-sm font-normal text-surface-muted"> W</span>
      </p>
      <p className="mt-1 text-[0.65rem] text-surface-muted">{powerLabel(unit.vermogen_w)}</p>
      {(unit.spanning_v != null || unit.stroom_a != null) && (
        <p className="mt-2 text-[0.65rem] tabular-nums text-surface-muted">
          {unit.spanning_v != null ? `${unit.spanning_v} V` : ""}
          {unit.spanning_v != null && unit.stroom_a != null ? " · " : ""}
          {unit.stroom_a != null ? `${unit.stroom_a} A` : ""}
        </p>
      )}
    </div>
  );
}

const FASE_LABELS: { key: keyof FaseLive; label: string }[] = [
  { key: "l1", label: "L1" },
  { key: "l2", label: "L2" },
  { key: "l3", label: "L3" },
];

export function PhasePanel({ data }: PhasePanelProps) {
  const fases = data.fases;
  if (!fases) return null;

  const active = FASE_LABELS.filter(({ key }) => fases[key] != null);
  if (active.length === 0) return null;

  const count = faseCount(fases);

  return (
    <Card variant="energy" className="overflow-hidden">
      <CardContent className="p-4">
        <p className="mb-3 text-[0.65rem] uppercase tracking-wide text-surface-muted">
          {count === 1 ? "1-fase" : count === 3 ? "3-fasen" : `${count} fasen`} · live
          vermogen
        </p>
        <div
          className={cn(
            "grid gap-3",
            active.length === 1
              ? "grid-cols-1"
              : active.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          )}
        >
          {active.map(({ key, label }) => {
            const unit = fases[key];
            if (!unit) return null;
            return <PhaseUnit key={key} name={label} unit={unit} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
