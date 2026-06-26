"use client";

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Droplets,
  Flame,
  Sun,
} from "lucide-react";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailyStatsProps {
  data: EnergieLive;
}

function MiniStat({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[0.6rem] uppercase tracking-wide text-zinc-300">
        {icon}
        {label}
      </div>
      <p className={cn("text-lg font-bold tabular-nums", accent ?? "text-zinc-100")}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-[0.65rem] text-zinc-400">{detail}</p> : null}
    </div>
  );
}

export function DailyStats({ data }: DailyStatsProps) {
  const waterFlow = Number(data.water_actueel) > 0;
  const hasMeterstand = data.water_meterstand_label != null;
  const enphase = data.enphase;
  const showZon = enphase?.bereikbaar && enphase.vandaag_kwh != null;

  return (
    <Card variant="energy" className="overflow-hidden">
      <CardContent className="p-0">
        <div
          className={cn(
            "grid grid-cols-1 divide-y divide-white/5 sm:divide-y-0",
            showZon ? "sm:grid-cols-3 sm:divide-x" : "sm:grid-cols-2 sm:divide-x"
          )}
        >
          {showZon ? (
            <MiniStat
              icon={<Sun className="h-3 w-3 text-amber-400" />}
              label="Zon vandaag"
              value={
                <>
                  {enphase.vandaag_kwh}{" "}
                  <span className="text-sm font-normal text-zinc-400">kWh</span>
                </>
              }
              detail={
                enphase.vermogen_w != null && enphase.vermogen_w > 0
                  ? `Nu ${enphase.vermogen_w} W`
                  : undefined
              }
              accent="text-amber-300"
            />
          ) : null}
          <MiniStat
            icon={<ArrowDownLeft className="h-3 w-3 text-zinc-400" />}
            label="Ingekocht"
            value={
              <>
                {data.stroom_vandaag_in}{" "}
                <span className="text-sm font-normal text-zinc-400">kWh</span>
              </>
            }
          />
          <MiniStat
            icon={<ArrowUpRight className="h-3 w-3 text-emerald-400" />}
            label="Teruggeleverd"
            value={
              <>
                {data.stroom_vandaag_uit}{" "}
                <span className="text-sm font-normal text-zinc-400">kWh</span>
              </>
            }
            accent="text-emerald-400"
          />
        </div>

        <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
          <MiniStat
            icon={<Flame className="h-3 w-3 text-amber-400" />}
            label="Gas vandaag"
            value={
              <>
                {data.gas_vandaag}{" "}
                <span className="text-sm font-normal text-zinc-400">m³</span>
              </>
            }
            accent="text-amber-100"
          />
          <MiniStat
            icon={
              waterFlow ? (
                <AlertCircle className="h-3 w-3 text-rose-400" />
              ) : (
                <Droplets className="h-3 w-3 text-sky-400" />
              )
            }
            label="Water vandaag"
            value={
              <>
                {data.water_vandaag}{" "}
                <span className="text-sm font-normal text-zinc-400">L</span>
              </>
            }
            detail={
              waterFlow ? `Flow ${data.water_actueel} L/min` : undefined
            }
            accent={waterFlow ? "text-rose-400" : "text-sky-100"}
          />
        </div>

        {hasMeterstand ? (
          <div className="border-t border-white/5 bg-black/20 px-4 py-3">
            <div className="flex items-start gap-3">
              <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-wide text-zinc-400">
                  Watermeter (geschat)
                </p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-sky-100">
                  {data.water_meterstand_label}{" "}
                  <span className="text-base font-normal text-zinc-400">m³</span>
                </p>
                <p className="mt-1 text-[0.65rem] text-zinc-400">
                  Op basis van opgave 1404 m³ (8-2-2026) + sensorverbruik
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
