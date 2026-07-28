"use client";

import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { formatPermissions } from "@/lib/homewizard/battery";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface BatteryPanelProps {
  data: EnergieLive;
}

function powerLabel(w: number): string {
  if (Math.abs(w) < 5) return "Standby";
  return w > 0 ? "Laden" : "Ontladen";
}

function BatteryUnit({
  label,
  soc,
  vermogen_w,
  bereikbaar,
  melding,
  voltage_v,
  cycles,
  vandaag_laden_kwh,
  vandaag_ontladen_kwh,
}: EnergieLive["batterijen"][number]) {
  const charging = vermogen_w > 5;
  const discharging = vermogen_w < -5;

  return (
    <div className={cn("text-center", !bereikbaar && "opacity-75")}>
      {!bereikbaar ? (
        <BatteryWarning className="mx-auto h-6 w-6 text-surface-muted" />
      ) : charging ? (
        <BatteryCharging className="mx-auto h-6 w-6 text-accent-weather" />
      ) : (
        <Battery
          className={cn(
            "mx-auto h-6 w-6",
            discharging ? "text-accent-export" : "text-accent-energy"
          )}
        />
      )}
      <Metric
        label={label}
        value={bereikbaar && soc != null ? soc : (melding ?? "Offline")}
        unit={bereikbaar && soc != null ? "%" : undefined}
        size="md"
        className="mt-2"
      />
      {bereikbaar ? (
        <>
          <p
            className={cn(
              "text-caption font-medium tabular-nums",
              charging && "text-accent-weather",
              discharging && "text-accent-export",
              !charging && !discharging && "text-surface-muted"
            )}
          >
            {powerLabel(vermogen_w)} · {Math.abs(vermogen_w)} W
          </p>
          {(voltage_v != null || cycles != null) && (
            <p className="text-caption mt-1 text-surface-muted">
              {voltage_v != null ? `${voltage_v} V` : ""}
              {voltage_v != null && cycles != null ? " · " : ""}
              {cycles != null ? `${cycles} cycli` : ""}
            </p>
          )}
          {(vandaag_laden_kwh != null || vandaag_ontladen_kwh != null) && (
            <p className="text-caption mt-1 text-surface-muted">
              Vandaag {vandaag_laden_kwh ?? 0} / {vandaag_ontladen_kwh ?? 0} kWh
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function BatteryPanel({ data }: BatteryPanelProps) {
  if (data.batterijen.length === 0) return null;

  const totaalLabel = powerLabel(data.batterij_vermogen_totaal);
  const hasOnline = data.batterijen.some((b) => b.bereikbaar);
  const groep = data.batterij_groep;

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-4">
        <div className="border-b border-border-subtle pb-4">
          {hasOnline && data.batterij_soc_gemiddeld != null ? (
            <Metric
              label="Gemiddeld geladen"
              value={data.batterij_soc_gemiddeld}
              unit="%"
              accent="violet"
              size="lg"
            />
          ) : groep?.bereikbaar ? (
            <p className="text-metric text-foreground">
              {groep.aantal} batterijen via P1
            </p>
          ) : (
            <p className="text-sm text-surface-muted">Geen batterij bereikbaar</p>
          )}
          {groep?.bereikbaar ? (
            <div className="mt-2 space-y-1 text-sm text-surface-muted">
              <p>
                {groep.mode_label} · {totaalLabel}{" "}
                {Math.abs(data.batterij_vermogen_totaal)} W
                {groep.target_power_w != null ? ` (doel ${groep.target_power_w} W)` : ""}
              </p>
              {(groep.max_laden_w != null || groep.max_ontladen_w != null) && (
                <p className="text-caption">
                  Max {groep.max_laden_w ?? "?"} W laden · {groep.max_ontladen_w ?? "?"} W
                  ontladen
                </p>
              )}
              {groep.permissions.length > 0 ? (
                <p className="text-caption">{formatPermissions(groep.permissions)}</p>
              ) : null}
            </div>
          ) : hasOnline ? (
            <p className="text-caption mt-1">
              {totaalLabel} · {Math.abs(data.batterij_vermogen_totaal)} W
            </p>
          ) : null}
          {data.batterij_hint ? (
            <p className="text-caption mt-2 text-accent-energy">{data.batterij_hint}</p>
          ) : null}
        </div>

        <MetricRow
          className={cn(
            data.batterijen.length === 1 && "grid-cols-1",
            data.batterijen.length === 2 && "grid-cols-2"
          )}
        >
          {data.batterijen.map((b) => (
            <BatteryUnit key={b.id} {...b} />
          ))}
        </MetricRow>
      </SurfaceBody>
    </Surface>
  );
}
