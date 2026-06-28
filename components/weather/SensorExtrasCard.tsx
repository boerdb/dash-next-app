"use client";

import { Battery, BatteryWarning, CloudLightning, Gauge } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { getLightningBattery } from "@/lib/weer/sensor-battery";
import {
  getLightningStatus,
  getLightningStatusLabel,
} from "@/lib/weer/lightning-storm";
import {
  hasLightningSensor,
  hasSensorExtras,
  hasWs90Sensor,
  isWh57Detected,
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-muted">
          {title}
        </h3>
      </div>
      <div className={accent}>{children}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-inset px-3 py-2.5 text-center">
      <p className="text-[0.6rem] uppercase tracking-wide text-surface-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function SensorExtrasCard({ data }: SensorExtrasCardProps) {
  if (!hasSensorExtras(data)) return null;

  const showLightning = hasLightningSensor(data);
  const showWs90 = hasWs90Sensor(data);
  const lightningBattery = getLightningBattery(data);
  const lightningStatus = getLightningStatus(data);
  const wh57Detected = isWh57Detected(data);
  const statusLabel = getLightningStatusLabel(data);
  const lightningKm = data.lightning_km;
  const recentStrike = lightningStatus === "strike";

  const bothSensors = showLightning && showWs90;

  return (
    <Card variant="weather" className="overflow-hidden border-violet-500/10">
      <CardContent className="p-0">
        <div
          className={cn(
            "grid divide-card-border",
            bothSensors ? "grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0" : "grid-cols-1"
          )}
        >
          {showLightning ? (
            <SensorBlock
              title="Bliksem"
              icon={
                <CloudLightning
                  className={cn(
                    "h-4 w-4",
                    recentStrike && "text-violet-300",
                    lightningStatus === "risk" && "text-amber-300",
                    lightningStatus === "airmass" && "text-amber-300/60",
                    lightningStatus === "idle" && wh57Detected && "text-emerald-400/80",
                    lightningStatus === "idle" && !wh57Detected && "text-surface-muted"
                  )}
                />
              }
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {wh57Detected ? (
                  <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-emerald-200">
                    WH57 gedetecteerd
                  </span>
                ) : null}
                {recentStrike ? (
                  <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-violet-200">
                    Recent
                  </span>
                ) : lightningStatus === "risk" ? (
                  <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-200">
                    Kans op onweer
                  </span>
                ) : lightningStatus === "airmass" ? (
                  <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-200/70">
                    Onweersgevoelig
                  </span>
                ) : null}
              </div>
              {lightningKm != null && lightningKm > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="Afstand"
                    value={
                      <>
                        {lightningKm}
                        <span className="ml-0.5 text-xs font-normal text-surface-muted">km</span>
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
                <p
                  className={cn(
                    "text-sm",
                    lightningStatus === "risk" && "text-amber-200/90",
                    lightningStatus === "airmass" && "text-amber-200/70",
                    lightningStatus === "idle" && wh57Detected && "text-emerald-200/80",
                    lightningStatus === "idle" && !wh57Detected && "text-surface-muted"
                  )}
                >
                  {statusLabel}
                </p>
              )}
              {lightningBattery ? (
                <div
                  className={cn(
                    "mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs",
                    lightningBattery.state === "low"
                      ? "border-amber-500/30 bg-amber-950/20 text-amber-200"
                      : "border-card-border bg-surface-inset text-surface-muted"
                  )}
                >
                  {lightningBattery.state === "low" ? (
                    <BatteryWarning className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Battery className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  <span>Batterij</span>
                  <strong className="tabular-nums text-foreground">
                    {lightningBattery.detail}
                  </strong>
                </div>
              ) : null}
            </SensorBlock>
          ) : null}

          {showWs90 ? (
            <SensorBlock
              title="WS90"
              icon={<Gauge className="h-4 w-4 text-cyan-400" />}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2">
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
