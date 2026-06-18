"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { BatterijGroep } from "@/lib/api/types";
import {
  isBatterijStandby,
  isBatterijZeroMode,
  resolveLaadstrategieFromGroep,
  type BatterijLaadstrategie,
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
  laadstrategie?: BatterijLaadstrategie;
};

const STORAGE_KEY = "hw-laadstrategie";

const STRATEGIES: {
  id: BatterijLaadstrategie;
  title: string;
  description: string;
  earlyAccess?: boolean;
  payload: ControlPayload;
}[] = [
  {
    id: "zero",
    title: "Nul op de meter",
    description:
      "Laadt direct zodra je stroom teruglevert en ontlaadt als je stroom uit het net gebruikt.",
    payload: {
      mode: "zero",
      permissions: ["charge_allowed", "discharge_allowed"],
      charge_to_full: false,
      laadstrategie: "zero",
    },
  },
  {
    id: "grid_friendly",
    title: "Slim en wijkvriendelijk",
    description:
      "Verschuift 'nul op de meter' naar de voorspelde piekmomenten van de dag. Zorgt dat het stroomnet en zonnepanelen in de wijk minder snel uitvallen.",
    earlyAccess: true,
    payload: { mode: "predictive", charge_to_full: false, laadstrategie: "grid_friendly" },
  },
  {
    id: "dynamic_hourly",
    title: "Slim met dynamisch tarief",
    description:
      "Voorspelt de beste laad- en ontlaadmomenten voor maximale besparing bij een dynamisch energiecontract. Stopt met laden als terugleveren meer oplevert.",
    earlyAccess: true,
    payload: {
      mode: "predictive",
      charge_to_full: false,
      laadstrategie: "dynamic_hourly",
    },
  },
];

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

function RadioMark({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        active ? "border-emerald-400" : "border-zinc-500"
      )}
      aria-hidden
    >
      {active ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> : null}
    </span>
  );
}

function StrategyOption({
  active,
  disabled,
  title,
  description,
  earlyAccess,
  showTariefInterval,
  onSelect,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  earlyAccess?: boolean;
  showTariefInterval?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition disabled:opacity-40",
        active
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-white">{title}</p>
            {earlyAccess ? (
              <span className="rounded-md bg-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                Vroege toegang
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
          {showTariefInterval ? (
            <div className="mt-2 flex gap-2">
              <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white">
                Per uur
              </span>
              <span
                className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-500"
                title="Alleen instelbaar in de HomeWizard-app"
              >
                Per kwartier
              </span>
            </div>
          ) : null}
        </div>
        <RadioMark active={active} />
      </div>
    </button>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Eenmalig volladen"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40",
        checked ? "bg-emerald-500" : "bg-zinc-600"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function readStoredLaadstrategie(
  fallback: BatterijLaadstrategie
): BatterijLaadstrategie {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (
    stored === "zero" ||
    stored === "grid_friendly" ||
    stored === "dynamic_hourly"
  ) {
    return stored;
  }
  return fallback;
}

export function BatteryControls({ groep, onUpdated }: BatteryControlsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BatterijLaadstrategie>(() =>
    resolveLaadstrategieFromGroep(groep)
  );

  useEffect(() => {
    setSelected(readStoredLaadstrategie(resolveLaadstrategieFromGroep(groep)));
  }, [groep.mode, groep.laadstrategie, groep.charge_to_full]);

  const chargingFull = groep.charge_to_full || groep.mode === "to_full";
  const standbyActive = isBatterijStandby(groep);

  const activeStrategy: BatterijLaadstrategie | null = chargingFull
    ? null
    : standbyActive
      ? null
      : isBatterijZeroMode(groep)
        ? "zero"
        : groep.mode === "predictive"
          ? selected
          : selected;

  const run = async (payload: ControlPayload) => {
    setBusy(true);
    setError(null);
    try {
      await sendControl(payload);
      if (payload.laadstrategie) {
        window.localStorage.setItem(STORAGE_KEY, payload.laadstrategie);
        setSelected(payload.laadstrategie);
      }
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aanpassing mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Laadstrategie voor alle batterijen
      </p>

      <div className="space-y-2">
        {STRATEGIES.map((strategy) => (
          <StrategyOption
            key={strategy.id}
            active={activeStrategy === strategy.id}
            disabled={busy}
            title={strategy.title}
            description={strategy.description}
            earlyAccess={strategy.earlyAccess}
            showTariefInterval={strategy.id === "dynamic_hourly"}
            onSelect={() => run(strategy.payload)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Eenmalig volladen</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Laadt één keer volledig vol en schakelt dan terug naar de
            geselecteerde laadstrategie.
          </p>
        </div>
        <Toggle
          checked={chargingFull}
          disabled={busy}
          onChange={(next) =>
            run({
              charge_to_full: next,
              laadstrategie: selected,
            })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400">Standby</p>
          <p className="text-[11px] text-zinc-500">Geen laden of ontladen</p>
        </div>
        <button
          type="button"
          disabled={busy || standbyActive}
          onClick={() =>
            run({ permissions: [], charge_to_full: false, laadstrategie: selected })
          }
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
        >
          {standbyActive ? "Actief" : "Inschakelen"}
        </button>
      </div>

      {busy ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Bezig…
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Tariefinterval &quot;Per uur&quot; of &quot;Per kwartier&quot; wijzig je
        in de HomeWizard-app. Dit dashboard gebruikt dezelfde namen en
        onthoudt je laadstrategie op de P1.
      </p>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
