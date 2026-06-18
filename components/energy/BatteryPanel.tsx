"use client";

import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import { BatteryControls } from "@/components/energy/BatteryControls";
import type { EnergieLive } from "@/lib/api/types";
import { formatPermissions } from "@/lib/homewizard/battery";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BatteryPanelProps {
  data: EnergieLive;
  onRefresh?: () => void;
}

function powerLabel(w: number): string {
  if (Math.abs(w) < 5) return "Standby";
  return w > 0 ? "Laden" : "Ontladen";
}

function BatteryCard({
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
    <Card
      variant="energy"
      className={cn(
        !bereikbaar && "border-zinc-600/30 opacity-80",
        charging && "border-sky-500/25",
        discharging && "border-emerald-500/25"
      )}
    >
      <CardContent className="text-center">
        {!bereikbaar ? (
          <BatteryWarning className="mx-auto h-8 w-8 text-zinc-500" />
        ) : charging ? (
          <BatteryCharging className="mx-auto h-8 w-8 text-sky-400" />
        ) : (
          <Battery
            className={cn(
              "mx-auto h-8 w-8",
              discharging ? "text-emerald-400" : "text-amber-300"
            )}
          />
        )}
        <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        {bereikbaar && soc != null ? (
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {soc}
            <span className="text-lg font-normal text-zinc-400">%</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">{melding ?? "Offline"}</p>
        )}
        {bereikbaar ? (
          <>
            <p
              className={cn(
                "mt-2 text-sm font-medium tabular-nums",
                charging && "text-sky-300",
                discharging && "text-emerald-400",
                !charging && !discharging && "text-zinc-400"
              )}
            >
              {powerLabel(vermogen_w)} · {Math.abs(vermogen_w)} W
            </p>
            {voltage_v != null ? (
              <p className="mt-1 text-xs text-zinc-500">{voltage_v} V</p>
            ) : null}
            {cycles != null ? (
              <p className="text-xs text-zinc-500">{cycles} cycli</p>
            ) : null}
            {(vandaag_laden_kwh != null || vandaag_ontladen_kwh != null) && (
              <p className="mt-2 text-xs text-zinc-400">
                Vandaag: {vandaag_laden_kwh ?? 0} kWh in ·{" "}
                {vandaag_ontladen_kwh ?? 0} kWh uit
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BatteryPanel({ data, onRefresh }: BatteryPanelProps) {
  if (data.batterijen.length === 0) return null;

  const totaalLabel = powerLabel(data.batterij_vermogen_totaal);
  const hasOnline = data.batterijen.some((b) => b.bereikbaar);
  const groep = data.batterij_groep;

  return (
    <div className="space-y-3">
      <Card variant="energy" className="border-violet-500/20">
        <CardContent>
          <p className="mb-2 border-l-2 border-violet-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
            Thuisbatterijen
          </p>
          {hasOnline && data.batterij_soc_gemiddeld != null ? (
            <p className="text-2xl font-bold text-white">
              Gemiddeld {data.batterij_soc_gemiddeld}
              <span className="text-sm font-normal text-zinc-400">% geladen</span>
            </p>
          ) : groep?.bereikbaar ? (
            <p className="text-2xl font-bold text-white">
              {groep.aantal} batterijen via P1
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Geen batterij bereikbaar</p>
          )}
          {groep?.bereikbaar ? (
            <div className="mt-2 space-y-1 text-sm text-violet-200/90">
              <p>
                Modus: <span className="text-white">{groep.mode_label}</span>
                {groep.charge_to_full ? " · opladen naar vol" : null}
              </p>
              <p>
                Totaal: {totaalLabel} · {Math.abs(data.batterij_vermogen_totaal)} W
                {groep.target_power_w != null
                  ? ` (doel ${groep.target_power_w} W)`
                  : null}
              </p>
              {(groep.max_laden_w != null || groep.max_ontladen_w != null) && (
                <p className="text-xs text-zinc-400">
                  Max {groep.max_laden_w ?? "?"} W laden ·{" "}
                  {groep.max_ontladen_w ?? "?"} W ontladen
                </p>
              )}
              {groep.permissions.length > 0 ? (
                <p className="text-xs text-zinc-400">
                  {formatPermissions(groep.permissions)}
                </p>
              ) : null}
            </div>
          ) : hasOnline ? (
            <p className="mt-1 text-sm text-violet-200/90">
              Totaal: {totaalLabel} · {Math.abs(data.batterij_vermogen_totaal)} W
            </p>
          ) : null}
          {data.batterij_hint ? (
            <p className="mt-2 text-xs text-amber-200/80">{data.batterij_hint}</p>
          ) : null}
          {groep?.bereikbaar ? (
            <BatteryControls groep={groep} onUpdated={onRefresh} />
          ) : null}
        </CardContent>
      </Card>

      <div
        className={cn(
          "grid gap-3",
          data.batterijen.length > 1 ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {data.batterijen.map((b) => (
          <BatteryCard key={b.id} {...b} />
        ))}
      </div>
    </div>
  );
}
