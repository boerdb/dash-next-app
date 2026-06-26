"use client";

import { Zap } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PowerHeroProps {
  data: EnergieLive;
}

export function PowerHero({ data }: PowerHeroProps) {
  const exporting = data.stroom_nu < 0;
  const powerColor = exporting ? "text-emerald-300" : "text-amber-100";
  const isPeak = data.tarief === 2;

  return (
    <section
      className={cn(
        "relative -mx-4 overflow-hidden rounded-b-3xl px-4 pb-6 pt-5 sm:-mx-6 md:-mx-8",
        exporting
          ? "bg-gradient-to-br from-emerald-950 via-emerald-900/80 to-slate-950"
          : "bg-gradient-to-br from-amber-950 via-orange-950/70 to-slate-950"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background sm:h-20" />
      </div>
      {exporting ? (
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
      ) : (
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-white/60">
              {exporting ? "Terugleveren" : "Netafname"}
            </p>
            <h1
              className={cn(
                "mt-1 text-6xl font-bold tabular-nums leading-none drop-shadow-lg",
                powerColor
              )}
            >
              {Math.abs(data.stroom_nu)}
              <span className="ml-1 text-2xl font-normal text-white/70">W</span>
            </h1>
            {exporting ? (
              <p className="mt-1 text-sm text-emerald-200/80">Levert terug aan het net</p>
            ) : null}
          </div>
          <Zap
            className={cn(
              "h-10 w-10 shrink-0 opacity-90 drop-shadow-md",
              powerColor
            )}
          />
        </div>

        <div className="mx-auto mt-4 flex max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/90 backdrop-blur-sm">
          <span>
            Tarief{" "}
            <strong
              className={cn(
                "font-semibold",
                isPeak ? "text-amber-300" : "text-sky-300"
              )}
            >
              {isPeak ? "Piek" : "Dal"}
            </strong>
          </span>
          <span className="hidden text-white/30 sm:inline">|</span>
          <span>
            Vandaag in{" "}
            <strong className="font-semibold tabular-nums text-white">
              {data.stroom_vandaag_in}
            </strong>{" "}
            kWh
          </span>
          <span className="hidden text-white/30 sm:inline">|</span>
          <span>
            Uit{" "}
            <strong className="font-semibold tabular-nums text-emerald-300">
              {data.stroom_vandaag_uit}
            </strong>{" "}
            kWh
          </span>
        </div>
      </div>
    </section>
  );
}
