"use client";

import { Battery, BatteryWarning, CloudLightning, Gauge, Thermometer } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { isRecentLightningStrike } from "@/lib/weer/lightning-time";
import {
  collectSensorBatteries,
  type SensorBatteryStatus,
} from "@/lib/weer/sensor-battery";
import {
  hasLightningSensor,
  hasSensorExtras,
  hasWs90Sensor,
  hasWh25Secondary,
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

function BatteryChip({ item }: { item: SensorBatteryStatus }) {
  const low = item.state === "low";
  return (
    <div
      className={cn(
        "flex min-w-[7rem] flex-col items-center rounded-xl border px-3 py-2 text-center",
        low
          ? "border-amber-500/30 bg-amber-950/20"
          : "border-zinc-600/30 bg-zinc-900/30"
      )}
    >
      {low ? (
        <BatteryWarning className="h-5 w-5 text-amber-400" />
      ) : (
        <Battery className="h-5 w-5 text-emerald-400" />
      )}
      <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-400">
        {item.label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          low ? "text-amber-300" : "text-zinc-200"
        )}
      >
        {item.detail}
      </p>
    </div>
  );
}

export function SensorExtrasCard({ data }: SensorExtrasCardProps) {
  if (!hasSensorExtras(data)) return null;

  const batteries = collectSensorBatteries(data);
  const showLightning = hasLightningSensor(data);
  const showWs90 = hasWs90Sensor(data);
  const showWh25 = hasWh25Secondary(data);
  const lightningKm = data.lightning_km;
  const recentStrike =
    lightningKm != null &&
    lightningKm > 0 &&
    isRecentLightningStrike(data.lightning_time ?? undefined);

  const rainTodayMm =
    showWs90 && data.dailyrain_piezo_mm != null
      ? data.dailyrain_piezo_mm
      : data.dailyrain_mm;

  return (
    <Card variant="weather" className="border-violet-500/15">
      <CardContent className="space-y-4">
        {showLightning ? (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <CloudLightning
                className={cn(
                  "h-5 w-5",
                  recentStrike ? "text-violet-300" : "text-zinc-500"
                )}
              />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                Bliksem
              </h2>
              {recentStrike ? (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-violet-200">
                  Recent
                </span>
              ) : null}
            </div>
            {lightningKm != null && lightningKm > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[0.65rem] uppercase text-zinc-500">Afstand</p>
                  <p className="text-xl font-bold tabular-nums text-violet-100">
                    {lightningKm}
                    <span className="ml-1 text-sm font-normal text-zinc-400">km</span>
                  </p>
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase text-zinc-500">Vandaag</p>
                  <p className="text-xl font-bold tabular-nums text-violet-100">
                    {data.lightning_num ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase text-zinc-500">Laatste</p>
                  <p className="text-sm font-semibold tabular-nums text-zinc-200">
                    {data.lightning_time
                      ? formatStrikeTime(data.lightning_time)
                      : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Geen inslagen gedetecteerd · sensor actief
              </p>
            )}
          </section>
        ) : null}

        {showWs90 ? (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                WS90 piezo
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
              <span>
                Vandaag:{" "}
                <strong className="tabular-nums">
                  {Number(rainTodayMm ?? 0).toFixed(1)} mm
                </strong>
              </span>
              {data.rainrate_piezo_mm != null ? (
                <span>
                  Nu:{" "}
                  <strong className="tabular-nums">
                    {Number(data.rainrate_piezo_mm).toFixed(1)} mm/u
                  </strong>
                </span>
              ) : null}
              {data.ws90_voltage_v != null ? (
                <span>
                  Batterij:{" "}
                  <strong className="tabular-nums">{data.ws90_voltage_v} V</strong>
                </span>
              ) : null}
              {data.ws90_cap_voltage_v != null ? (
                <span>
                  Supercap:{" "}
                  <strong className="tabular-nums">
                    {data.ws90_cap_voltage_v} V
                  </strong>
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {showWh25 ? (
          <section className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <Thermometer className="h-4 w-4 text-sky-400" />
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              WH25 buiten
            </span>
            {data.temp2_c != null ? (
              <strong className="tabular-nums">{Number(data.temp2_c).toFixed(1)}°C</strong>
            ) : null}
            {data.humidity2 != null ? (
              <>
                <span className="text-zinc-600">·</span>
                <strong className="tabular-nums">{data.humidity2}%</strong>
                <span className="text-xs text-zinc-500">vocht</span>
              </>
            ) : null}
          </section>
        ) : null}

        {batteries.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sensorbatterijen
            </p>
            <div className="flex flex-wrap gap-2">
              {batteries.map((b) => (
                <BatteryChip key={b.label} item={b} />
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
