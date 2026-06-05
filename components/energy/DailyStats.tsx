"use client";

import { AlertCircle, Droplets, Flame, Sun } from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailyStatsProps {
  data: EnergieLive;
}

export function DailyStats({ data }: DailyStatsProps) {
  const waterFlow = Number(data.water_actueel) > 0;
  const hasMeterstand = data.water_meterstand_label != null;
  const enphase = data.enphase;
  const showZon =
    enphase?.bereikbaar && enphase.vandaag_kwh != null;

  return (
    <div className="space-y-3">
      <Card variant="energy">
        <CardContent>
          <p className="mb-2 border-l-2 border-amber-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
            Vandaag (stroom)
          </p>
          {showZon ? (
            <p className="text-2xl font-bold text-amber-300">
              <Sun className="mr-1.5 inline h-6 w-6 -translate-y-0.5" />
              {enphase.vandaag_kwh}{" "}
              <span className="text-sm font-normal text-zinc-400">kWh opgewekt</span>
              {enphase.vermogen_w != null && enphase.vermogen_w > 0 ? (
                <span className="mt-1 block text-sm font-normal text-amber-200/80">
                  Nu {enphase.vermogen_w} W
                </span>
              ) : null}
            </p>
          ) : null}
          <p
            className={cn(
              "text-2xl font-bold text-white",
              showZon && "mt-2"
            )}
          >
            {data.stroom_vandaag_in}{" "}
            <span className="text-sm font-normal text-zinc-400">kWh ingekocht</span>
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {data.stroom_vandaag_uit}{" "}
            <span className="text-sm font-normal text-zinc-400">kWh teruggeleverd</span>
          </p>
        </CardContent>
      </Card>

      {hasMeterstand ? (
        <Card variant="energy" className="border-sky-500/25">
          <CardContent>
            <div className="flex items-start gap-3">
              <Droplets className="mt-0.5 h-7 w-7 shrink-0 text-sky-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Watermeter (geschat)
                </p>
                <p className="text-3xl font-bold tabular-nums text-sky-100">
                  {data.water_meterstand_label}{" "}
                  <span className="text-lg font-normal text-zinc-400">m³</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Op basis van opgave 1404 m³ (8-2-2026) + sensorverbruik
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Vandaag: {data.water_vandaag} L
                  {waterFlow ? (
                    <span className="text-rose-400">
                      {" "}
                      · flow {data.water_actueel} L/min
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card variant="energy" className="border-amber-500/15">
          <CardContent className="text-center">
            <Flame className="mx-auto h-7 w-7 text-amber-400" />
            <p className="mt-2 text-xs uppercase text-zinc-400">Gas vandaag</p>
            <p className="text-xl font-bold text-amber-100">{data.gas_vandaag} m³</p>
          </CardContent>
        </Card>

        {!hasMeterstand ? (
          <Card
            variant="energy"
            className={cn(waterFlow ? "border-rose-500/40" : "border-sky-500/15")}
          >
            <CardContent className="text-center">
              {waterFlow ? (
                <AlertCircle className="mx-auto h-7 w-7 text-rose-400" />
              ) : (
                <Droplets className="mx-auto h-7 w-7 text-sky-400" />
              )}
              <p className="mt-2 text-xs uppercase text-zinc-400">Water vandaag</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  waterFlow ? "text-rose-400" : "text-sky-100"
                )}
              >
                {data.water_vandaag} L
              </p>
              {waterFlow && (
                <p className="mt-1 text-xs text-rose-400">
                  Actuele flow: {data.water_actueel} L/min
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card
            variant="energy"
            className={cn(
              waterFlow ? "border-rose-500/40" : "border-sky-500/15"
            )}
          >
            <CardContent className="text-center">
              {waterFlow ? (
                <AlertCircle className="mx-auto h-7 w-7 text-rose-400" />
              ) : (
                <Droplets className="mx-auto h-7 w-7 text-sky-400" />
              )}
              <p className="mt-2 text-xs uppercase text-zinc-400">Water vandaag</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  waterFlow ? "text-rose-400" : "text-sky-100"
                )}
              >
                {data.water_vandaag} L
              </p>
              {waterFlow && (
                <p className="mt-1 text-xs text-rose-400">
                  Actuele flow: {data.water_actueel} L/min
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
