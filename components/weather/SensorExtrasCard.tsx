"use client";

import { Battery, BatteryWarning, CloudLightning, Gauge } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { isRecentLightningStrike } from "@/lib/weer/lightning-time";
import { getLightningBattery } from "@/lib/weer/sensor-battery";
import {
  hasLightningSensor,
  hasSensorExtras,
  hasWs90Sensor,
} from "@/lib/weer/sensor-status";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SensorExtrasCardProps {
  data: WeerLive;
}

function formatStrikeTime(iso: string): string {
  const parts = iso.split(" ");
  if (parts.length < 2) return iso;
  return parts[1]?.slice(0, 5) ?? iso;
}

function SensorBlock({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </h3>
      </div>
      <div className={accent}>{children}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2.5 text-center">
      <p className="text-[0.6rem] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

export function SensorExtrasCard({ data }: SensorExtrasCardProps) {
  if (!hasSensorExtras(data)) return null;

  const showLightning = hasLightningSensor(data);
  const showWs90 = hasWs90Sensor(data);
  const lightningBattery = getLightningBattery(data);
  const lightningKm = data.lightning_km;
  const recentStrike =
    lightningKm != null &&
    lightningKm > 0 &&
    isRecentLightningStrike(data.lightning_time ?? undefined);

  const rainTodayMm =
    showWs90 && data.dailyrain_piezo_mm != null
      ? data.dailyrain_piezo_mm
      : data.dailyrain_mm;

  const bothSensors = showLightning && showWs90;

  return (
    <Card variant="weather" className="overflow-hidden border-violet-500/10">
      <CardContent className="p-0">
        <div
          className={cn(
            "grid divide-white/5",
            bothSensors ? "grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0" : "grid-cols-1"
          )}
        >
          {showLightning ? (
            <SensorBlock
              title="Bliksem WH57"
              icon={
                <CloudLightning
                  className={cn(
                    "h-4 w-4",
                    recentStrike ? "text-violet-300" : "text-zinc-500"
                  )}
                />
              }
            >
              {recentStrike ? (
                <span className="mb-3 inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-violet-200">
                  Recent
                </span>
              ) : null}
              {lightningKm != null && lightningKm > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="Afstand"
                    value={
                      <>
                        {lightningKm}
                        <span className="ml-0.5 text-xs font-normal text-zinc-500">km</span>
                      </>
                    }
                  />
                  <MiniMetric label="Vandaag" value={data.lightning_num ?? 0} />
                  <MiniMetric
                    label="Laatste"
                    value={
                      data.lightning_time ? formatStrikeTime(data.lightning_time) : "—"
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Geen inslagen · sensor actief</p>
              )}
              {lightningBattery ? (
                <div
                  className={cn(
                    "mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs",
                    lightningBattery.state === "low"
                      ? "border-amber-500/30 bg-amber-950/20 text-amber-200"
                      : "border-white/5 bg-black/20 text-zinc-400"
                  )}
                >
                  {lightningBattery.state === "low" ? (
                    <BatteryWarning className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Battery className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  <span>Batterij</span>
                  <strong className="tabular-nums text-zinc-200">
                    {lightningBattery.detail}
                  </strong>
                </div>
              ) : null}
            </SensorBlock>
          ) : null}

          {showWs90 ? (
            <SensorBlock
              title="WS90 piezo"
              icon={<Gauge className="h-4 w-4 text-cyan-400" />}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2">
                <MiniMetric
                  label="Vandaag"
                  value={`${Number(rainTodayMm ?? 0).toFixed(1)} mm`}
                />
                {data.rainrate_piezo_mm != null ? (
                  <MiniMetric
                    label="Nu"
                    value={`${Number(data.rainrate_piezo_mm).toFixed(1)} mm/u`}
                  />
                ) : null}
                {data.ws90_voltage_v != null ? (
                  <MiniMetric label="Batterij" value={`${data.ws90_voltage_v} V`} />
                ) : null}
                {data.ws90_cap_voltage_v != null ? (
                  <MiniMetric label="Supercap" value={`${data.ws90_cap_voltage_v} V`} />
                ) : null}
              </div>
            </SensorBlock>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
