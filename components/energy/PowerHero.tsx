"use client";

import { Zap } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface PowerHeroProps {
  data: EnergieLive;
}

export function PowerHero({ data }: PowerHeroProps) {
  const exporting = data.stroom_nu < 0;
  const isPeak = data.tarief === 2;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
      <Surface
        level="raised"
        className={cn(
          "relative overflow-hidden border-t-[3px]",
          exporting ? "border-t-accent-export" : "border-t-accent-energy"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            exporting ? "bg-accent-export-soft" : "bg-accent-energy-soft"
          )}
          aria-hidden
        />
        <SurfaceBody className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-label text-surface-muted">
                {exporting ? "Terugleveren" : "Netafname"}
              </p>
              <h1
                className={cn(
                  "mt-1 flex items-baseline gap-1 leading-none",
                  exporting ? "text-accent-export" : "text-accent-energy"
                )}
              >
                <span className="text-2xl font-bold tabular-nums">
                  {Math.abs(data.stroom_nu)}
                </span>
                <span className="text-2xl font-normal text-surface-muted">W</span>
              </h1>
              {exporting ? (
                <p className="text-caption mt-1 text-accent-export">
                  Levert terug aan het net
                </p>
              ) : null}
            </div>
            <Zap
              className={cn(
                "h-10 w-10 shrink-0",
                exporting ? "text-accent-export" : "text-accent-energy"
              )}
            />
          </div>
        </SurfaceBody>
      </Surface>

      <Surface level="flat" className="mt-4 lg:mt-0">
        <SurfaceBody className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-surface-muted">Tarief</span>
            <span
              className={cn(
                "font-semibold",
                isPeak ? "text-accent-energy" : "text-accent-weather"
              )}
            >
              {isPeak ? "Piek" : "Dal"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-surface-muted">Vandaag in</span>
            <span className="font-semibold tabular-nums">{data.stroom_vandaag_in} kWh</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-surface-muted">Vandaag uit</span>
            <span className="font-semibold tabular-nums text-accent-export">
              {data.stroom_vandaag_uit} kWh
            </span>
          </div>
        </SurfaceBody>
      </Surface>
    </div>
  );
}
