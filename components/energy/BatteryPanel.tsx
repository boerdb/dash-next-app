"use client";

import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BatteryPanelProps {
  data: EnergieLive;
}

function powerLabel(w: number): string {
  if (Math.abs(w) < 5) return "Standby";
  return w > 0 ? "Laden" : "Ontladen";
}

function BatteryCard({
  id,
  soc,
  vermogen_w,
  bereikbaar,
  melding,
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
          Batterij .{id}
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
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BatteryPanel({ data }: BatteryPanelProps) {
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
              <span className="ml-2 text-sm font-normal text-zinc-400">
                modus {groep.mode}
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Geen batterij bereikbaar</p>
          )}
          {(hasOnline || groep?.bereikbaar) && (
            <p className="mt-1 text-sm text-violet-200/90">
              Totaal: {totaalLabel} · {Math.abs(data.batterij_vermogen_totaal)} W
            </p>
          )}
          {data.batterij_hint ? (
            <p className="mt-2 text-xs text-amber-200/80">{data.batterij_hint}</p>
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
