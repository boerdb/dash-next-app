"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { BatterijGroep } from "@/lib/api/types";
import {
  isBatterijStandby,
  isBatterijZeroMode,
} from "@/lib/homewizard/battery";
import { cn } from "@/lib/utils";

interface BatteryControlsProps {
  groep: BatterijGroep;
  onUpdated?: () => void;
}

type ControlPayload = {
  mode?: "zero" | "predictive";
  permissions?: ("charge_allowed" | "discharge_allowed")[];
  charge_to_full?: boolean;
};

async function sendControl(payload: ControlPayload): Promise<BatterijGroep> {
  const res = await fetch("/api/energie/batterij", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: { error?: string; groep?: BatterijGroep } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(body.error ?? `Fout ${res.status}`);
  }
  if (!body.groep) {
    throw new Error("Geen antwoord van P1-meter");
  }
  return body.groep;
}

function StrategyButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-2 text-xs font-medium transition disabled:opacity-40",
        active
          ? "bg-violet-500/30 text-white ring-1 ring-violet-400/50"
          : "bg-white/5 text-zinc-300 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

export function BatteryControls({ groep, onUpdated }: BatteryControlsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (payload: ControlPayload) => {
    setBusy(true);
    setError(null);
    try {
      await sendControl(payload);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aanpassing mislukt");
    } finally {
      setBusy(false);
    }
  };

  const zeroActive = isBatterijZeroMode(groep);
  const predictiveActive = groep.mode === "predictive" && !groep.charge_to_full;
  const standbyActive = isBatterijStandby(groep);
  const chargingFull = groep.charge_to_full || groep.mode === "to_full";

  return (
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Bediening via P1
      </p>

      <div className="grid grid-cols-3 gap-2">
        <StrategyButton
          active={zeroActive}
          disabled={busy}
          onClick={() =>
            run({
              mode: "zero",
              permissions: ["charge_allowed", "discharge_allowed"],
              charge_to_full: false,
            })
          }
        >
          Nul op de meter
        </StrategyButton>
        <StrategyButton
          active={predictiveActive}
          disabled={busy}
          onClick={() => run({ mode: "predictive", charge_to_full: false })}
        >
          Dyn. tarief/uur
        </StrategyButton>
        <StrategyButton
          active={standbyActive}
          disabled={busy}
          onClick={() => run({ permissions: [], charge_to_full: false })}
        >
          Standby
        </StrategyButton>
      </div>

      <div className="flex flex-wrap gap-2">
        {!chargingFull ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run({ charge_to_full: true })}
            className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 ring-1 ring-sky-400/30 hover:bg-sky-500/30 disabled:opacity-40"
          >
            Volladen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => run({ charge_to_full: false })}
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/30 disabled:opacity-40"
          >
            Stop volladen
          </button>
        )}
        {busy ? (
          <span className="inline-flex items-center gap-1.5 px-1 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Bezig…
          </span>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Tariefinterval &quot;Per uur&quot; stel je eenmalig in via HomeWizard-app
        → Laadstrategie → Slim met dynamisch tarief. Daarna onthoudt de P1 die
        keuze bij bediening vanuit dit dashboard.
      </p>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
