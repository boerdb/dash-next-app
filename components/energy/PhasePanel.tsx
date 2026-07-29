"use client";

import { Zap } from "lucide-react";
import type { EnergieLive, FaseLive, FaseUnit } from "@/lib/api/types";
import { faseCount } from "@/lib/homewizard/p1-phases";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface PhasePanelProps {
  data: EnergieLive;
}

function powerLabel(w: number): string {
  if (Math.abs(w) < 5) return "Rust";
  return w < 0 ? "Terug" : "Afname";
}

function PhaseMetric({ name, unit }: { name: string; unit: FaseUnit }) {
  const exporting = unit.vermogen_w < 0;
  const accent = exporting ? "export" : Math.abs(unit.vermogen_w) < 5 ? "default" : "energy";

  return (
    <div className="text-center">
      <Zap
        className={cn(
          "mx-auto h-5 w-5",
          exporting ? "text-accent-export" : "text-accent-energy"
        )}
      />
      <Metric
        label={name}
        value={Math.abs(unit.vermogen_w)}
        unit="W"
        accent={accent}
        size="md"
        className="mt-2 text-center [&>p:first-child]:text-center [&>p:last-child]:justify-center"
      />
      <p className="text-caption text-surface-muted">{powerLabel(unit.vermogen_w)}</p>
      {(unit.spanning_v != null || unit.stroom_a != null) && (
        <p className="text-caption mt-1 tabular-nums text-surface-muted">
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
    <Surface level="raised">
      <SurfaceBody>
        <p className="text-label mb-4 text-surface-muted">
          {count === 1 ? "1-fase" : count === 3 ? "3-fasen" : `${count} fasen`} · live
        </p>
        <MetricRow
          className={cn(
            active.length === 1 && "grid-cols-1 sm:grid-cols-1 lg:grid-cols-1",
            active.length === 2 && "grid-cols-2 sm:grid-cols-2 lg:grid-cols-2",
            active.length === 3 && "grid-cols-3 sm:grid-cols-3 lg:grid-cols-3"
          )}
        >
          {active.map(({ key, label }) => {
            const unit = fases[key];
            if (!unit) return null;
            return <PhaseMetric key={key} name={label} unit={unit} />;
          })}
        </MetricRow>
      </SurfaceBody>
    </Surface>
  );
}
