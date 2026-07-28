"use client";

import { Battery, BatteryWarning, CloudLightning } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { getLightningBattery } from "@/lib/weer/sensor-battery";
import {
  getLightningStatus,
  getLightningStatusLabel,
} from "@/lib/weer/lightning-storm";
import {
  hasLightningSensor,
  isWh57Detected,
} from "@/lib/weer/sensor-status";
import { cn } from "@/lib/utils";

function formatStrikeTime(iso: string): string {
  const parts = iso.split(" ");
  if (parts.length < 2) return iso;
  return parts[1]?.slice(0, 5) ?? iso;
}

export function LightningPanel({ data }: { data: WeerLive }) {
  if (!hasLightningSensor(data)) return null;

  const lightningStatus = getLightningStatus(data);
  const wh57Detected = isWh57Detected(data);
  const lightningBattery = getLightningBattery(data);
  const recentStrike = lightningStatus === "strike";
  const lightningKm = data.lightning_km;
  const statusLabel = getLightningStatusLabel(data);

  return (
    <Surface level="raised">
      <SurfaceBody>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CloudLightning
              className={cn(
                "h-5 w-5",
                recentStrike && "text-accent-violet",
                lightningStatus === "risk" && "text-accent-energy",
                lightningStatus === "idle" && "text-accent-export"
              )}
            />
            <p className="text-label text-surface-muted">Bliksem</p>
          </div>
          {lightningBattery ? (
            <Badge variant={lightningBattery.state === "low" ? "energy" : "default"}>
              {lightningBattery.state === "low" ? (
                <BatteryWarning className="h-3 w-3" />
              ) : (
                <Battery className="h-3 w-3" />
              )}
              {lightningBattery.detail}
            </Badge>
          ) : null}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {wh57Detected ? <Badge variant="export">WH57</Badge> : null}
          {recentStrike ? (
            <Badge variant="violet">Recent</Badge>
          ) : lightningStatus === "risk" ? (
            <Badge variant="energy">Kans op onweer</Badge>
          ) : lightningStatus === "airmass" ? (
            <Badge variant="energy">Onweersgevoelig</Badge>
          ) : null}
        </div>

        {lightningKm != null && lightningKm > 0 ? (
          <MetricRow>
            <Metric label="Afstand" value={lightningKm} unit="km" accent="violet" />
            <Metric label="Vandaag" value={data.lightning_num ?? 0} accent="violet" />
            <Metric
              label="Laatste"
              value={data.lightning_time ? formatStrikeTime(data.lightning_time) : "—"}
            />
          </MetricRow>
        ) : (
          <p className="text-sm font-medium text-foreground">{statusLabel}</p>
        )}
      </SurfaceBody>
    </Surface>
  );
}
