"use client";

import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { formatPermissions } from "@/lib/homewizard/battery";
import { Card, CardContent } from "@/components/ui/card";
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
    <div
      className={cn(
        "rounded-xl border border-card-border bg-surface-inset p-3 text-center",
        !bereikbaar && "opacity-75",
        charging && "border-sky-500/20",
        discharging && "border-emerald-500/20"
      )}
    >
      {!bereikbaar ? (
        <BatteryWarning className="mx-auto h-6 w-6 text-surface-muted" />
      ) : charging ? (
        <BatteryCharging className="mx-auto h-6 w-6 text-sky-400" />
      ) : (
        <Battery
          className={cn(
            "mx-auto h-6 w-6",
            discharging ? "text-emerald-400" : "text-amber-300"
          )}
        />
      )}
      <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-surface-muted">
        {label}
      </p>
      {bereikbaar && soc != null ? (
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {soc}
          <span className="text-sm font-normal text-surface-muted">%</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-surface-muted">{melding ?? "Offline"}</p>
      )}
      {bereikbaar ? (
        <>
          <p
            className={cn(
              "mt-2 text-xs font-medium tabular-nums",
              charging && "text-sky-300",
              discharging && "text-emerald-400",
              !charging && !discharging && "text-surface-muted"
            )}
          >
            {powerLabel(vermogen_w)} · {Math.abs(vermogen_w)} W
          </p>
          {(voltage_v != null || cycles != null) && (
            <p className="mt-1 text-[0.65rem] text-surface-muted">
              {voltage_v != null ? `${voltage_v} V` : ""}
              {voltage_v != null && cycles != null ? " · " : ""}
              {cycles != null ? `${cycles} cycli` : ""}
            </p>
          )}
          {(vandaag_laden_kwh != null || vandaag_ontladen_kwh != null) && (
            <p className="mt-1.5 text-[0.65rem] text-surface-muted">
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
    <Card variant="energy" className="overflow-hidden border-violet-500/15">
      <CardContent className="space-y-4 p-4">
        <div className="rounded-xl border border-violet-500/15 bg-violet-100/50 px-4 py-3 dark:bg-violet-950/20">
          {hasOnline && data.batterij_soc_gemiddeld != null ? (
            <p className="text-xl font-bold text-foreground">
              Gemiddeld {data.batterij_soc_gemiddeld}
              <span className="text-sm font-normal text-surface-muted">% geladen</span>
            </p>
          ) : groep?.bereikbaar ? (
            <p className="text-xl font-bold text-foreground">
              {groep.aantal} batterijen via P1
            </p>
          ) : (
            <p className="text-sm text-surface-muted">Geen batterij bereikbaar</p>
          )}
          {groep?.bereikbaar ? (
            <div className="mt-2 space-y-1 text-sm text-violet-200/90">
              <p>
                {groep.mode_label} · {totaalLabel}{" "}
                {Math.abs(data.batterij_vermogen_totaal)} W
                {groep.target_power_w != null ? ` (doel ${groep.target_power_w} W)` : ""}
              </p>
              {(groep.max_laden_w != null || groep.max_ontladen_w != null) && (
                <p className="text-xs text-surface-muted">
                  Max {groep.max_laden_w ?? "?"} W laden · {groep.max_ontladen_w ?? "?"} W
                  ontladen
                </p>
              )}
              {groep.permissions.length > 0 ? (
                <p className="text-xs text-surface-muted">
                  {formatPermissions(groep.permissions)}
                </p>
              ) : null}
            </div>
          ) : hasOnline ? (
            <p className="mt-1 text-sm text-violet-200/90">
              {totaalLabel} · {Math.abs(data.batterij_vermogen_totaal)} W
            </p>
          ) : null}
          {data.batterij_hint ? (
            <p className="mt-2 text-xs text-amber-200/80">{data.batterij_hint}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "grid gap-3",
            data.batterijen.length > 1 ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {data.batterijen.map((b) => (
            <BatteryUnit key={b.id} {...b} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
