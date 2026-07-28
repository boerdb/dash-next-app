"use client";

import { Battery, BatteryCharging, Home, Sun, Zap } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface EnergyFlowProps {
  data: EnergieLive;
}

export function EnergyFlow({ data }: EnergyFlowProps) {
  const exporting = data.stroom_nu < 0;
  const solarW = data.enphase?.vermogen_w ?? 0;
  const batteryW = data.batterij_vermogen_totaal;
  const gridW = data.stroom_nu;
  const hasSolar = data.enphase?.bereikbaar && solarW > 0;
  const hasBattery = data.batterijen.some((b) => b.bereikbaar);

  return (
    <Surface level="flat">
      <SurfaceBody>
        <p className="text-label mb-4 text-surface-muted">Energiestromen</p>
        <div className="grid grid-cols-3 items-center gap-2 text-center">
          <FlowNode
            icon={Sun}
            label="Zon"
            value={hasSolar ? `${solarW} W` : "—"}
            accent="energy"
            active={Boolean(hasSolar)}
          />
          <FlowNode
            icon={Home}
            label="Huis"
            value={`${Math.abs(gridW)} W`}
            accent="default"
            active
          />
          <FlowNode
            icon={Zap}
            label="Net"
            value={`${Math.abs(gridW)} W`}
            accent={exporting ? "export" : "energy"}
            active={Math.abs(gridW) > 5}
          />
        </div>
        {hasBattery ? (
          <div className="mt-4 flex justify-center">
            <FlowNode
              icon={batteryW > 5 ? BatteryCharging : Battery}
              label="Batterij"
              value={`${Math.abs(batteryW)} W`}
              accent="violet"
              active={Math.abs(batteryW) > 5}
            />
          </div>
        ) : null}
      </SurfaceBody>
    </Surface>
  );
}

function FlowNode({
  icon: Icon,
  label,
  value,
  accent,
  active,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  accent: "energy" | "export" | "violet" | "default";
  active: boolean;
}) {
  const accentClass = {
    energy: "text-accent-energy",
    export: "text-accent-export",
    violet: "text-accent-violet",
    default: "text-foreground",
  }[accent];

  const accentBg = {
    energy: "bg-accent-energy-soft border-accent-energy/25",
    export: "bg-accent-export-soft border-accent-export/25",
    violet: "bg-accent-violet-soft border-accent-violet/25",
    default: "bg-surface-subtle border-border-subtle",
  }[accent];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border px-2 py-3",
        active ? accentBg : "border-border-subtle opacity-50"
      )}
    >
      <span
        className={cn(
          "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full",
          active ? accentBg : "bg-surface-subtle"
        )}
      >
        <Icon className={cn("h-5 w-5", accentClass)} />
      </span>
      <p className="text-label mt-2 text-surface-muted">{label}</p>
      <p className={cn("text-caption mt-1 font-semibold tabular-nums", accentClass)}>
        {value}
      </p>
    </div>
  );
}
