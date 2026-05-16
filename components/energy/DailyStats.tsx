"use client";

import { AlertCircle, Droplets, Flame } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";

interface DailyStatsProps {
  data: EnergieLive;
}

export function DailyStats({ data }: DailyStatsProps) {
  const waterFlow = Number(data.water_actueel) > 0;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
            Vandaag (stroom)
          </p>
          <p className="text-2xl font-bold">
            {data.stroom_vandaag_in}{" "}
            <span className="text-sm font-normal text-zinc-400">kWh ingekocht</span>
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {data.stroom_vandaag_uit}{" "}
            <span className="text-sm font-normal text-zinc-400">kWh teruggeleverd</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="text-center">
            <Flame className="mx-auto h-7 w-7 text-amber-400" />
            <p className="mt-2 text-xs uppercase text-zinc-400">Gas vandaag</p>
            <p className="text-xl font-bold">{data.gas_vandaag} m³</p>
          </CardContent>
        </Card>

        <Card className={waterFlow ? "border-rose-500/40" : undefined}>
          <CardContent className="text-center">
            {waterFlow ? (
              <AlertCircle className="mx-auto h-7 w-7 text-rose-400" />
            ) : (
              <Droplets className="mx-auto h-7 w-7 text-sky-400" />
            )}
            <p className="mt-2 text-xs uppercase text-zinc-400">Water vandaag</p>
            <p className={`text-xl font-bold ${waterFlow ? "text-rose-400" : ""}`}>
              {data.water_vandaag} L
            </p>
            {waterFlow && (
              <p className="mt-1 text-xs text-rose-400">
                Actuele flow: {data.water_actueel} L/min
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
