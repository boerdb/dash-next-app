"use client";

import { Zap } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PowerHeroProps {
  data: EnergieLive;
}

export function PowerHero({ data }: PowerHeroProps) {
  const exporting = data.stroom_nu < 0;
  const powerColor = exporting ? "text-emerald-400" : "text-amber-100";

  return (
    <Card
      variant="energy"
      className={cn(
        exporting &&
          "border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card to-card shadow-[0_0_40px_-10px_rgba(52,211,153,0.4)]"
      )}
    >
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            {exporting ? "Nu terugleveren" : "Netafname nu"}
          </p>
          <h1 className={cn("text-5xl font-bold tabular-nums", powerColor)}>
            {data.stroom_nu}
            <span className="ml-2 text-2xl font-normal">W</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Actueel tarief:{" "}
            <span
              className={cn(
                "font-semibold",
                data.tarief === 2 ? "text-amber-400" : "text-sky-300"
              )}
            >
              {data.tarief === 2 ? "Piek" : "Dal"}
            </span>
          </p>
        </div>
        <Zap className={cn("h-12 w-12 opacity-80", powerColor)} />
      </CardContent>
    </Card>
  );
}
