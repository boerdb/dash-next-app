"use client";

import { Zap } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PowerHeroProps {
  data: EnergieLive;
}

export function PowerHero({ data }: PowerHeroProps) {
  const exporting = data.stroom_nu < 0;
  const isPeak = data.tarief === 2;

  return (
    <section
      className={cn(
        "relative -mx-4 overflow-hidden rounded-b-3xl border-b border-card-border px-4 pb-6 pt-5 sm:-mx-6 md:-mx-8",
        exporting ? "bg-accent-export-soft" : "bg-accent-energy-soft"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption font-medium uppercase text-hero-muted">
              {exporting ? "Terugleveren" : "Netafname"}
            </p>
            <h1
              className={cn(
                "mt-1 text-6xl font-bold tabular-nums leading-none",
                exporting ? "text-accent-export" : "text-accent-energy"
              )}
            >
              {Math.abs(data.stroom_nu)}
              <span className="ml-1 text-2xl font-normal text-hero-muted">W</span>
            </h1>
            {exporting ? (
              <p className="mt-1 text-sm text-accent-export">Levert terug aan het net</p>
            ) : null}
          </div>
          <Zap
            className={cn(
              "h-10 w-10 shrink-0",
              exporting ? "text-accent-export" : "text-accent-energy"
            )}
          />
        </div>

        <div className="mx-auto mt-4 flex max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-card-border bg-card px-4 py-2.5 text-sm text-foreground shadow-[var(--elevation-shadow)]">
          <span>
            Tarief{" "}
            <strong
              className={cn(
                "font-semibold",
                isPeak ? "text-accent-energy" : "text-accent-weather"
              )}
            >
              {isPeak ? "Piek" : "Dal"}
            </strong>
          </span>
          <span className="hidden text-surface-muted sm:inline">|</span>
          <span>
            Vandaag in{" "}
            <strong className="font-semibold tabular-nums text-foreground">
              {data.stroom_vandaag_in}
            </strong>{" "}
            kWh
          </span>
          <span className="hidden text-surface-muted sm:inline">|</span>
          <span>
            Uit{" "}
            <strong className="font-semibold tabular-nums text-accent-export">
              {data.stroom_vandaag_uit}
            </strong>{" "}
            kWh
          </span>
        </div>
      </div>
    </section>
  );
}
