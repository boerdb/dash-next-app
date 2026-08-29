"use client";

import { CloudLightning } from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Metric, MetricRow } from "@/components/ui/metric";
import { StationCard } from "@/components/weather/station-card";
import {
  getLightningStatus,
  getLightningStatusLabel,
} from "@/lib/weer/lightning-storm";
import { hasLightningSensor } from "@/lib/weer/sensor-status";
import { cn } from "@/lib/utils";

function formatStrikeTime(iso: string): string {
  const parts = iso.split(" ");
  if (parts.length < 2) return iso;
  return parts[1]?.slice(0, 5) ?? iso;
}

export function LightningPanel({ data }: { data: WeerLive }) {
  if (!hasLightningSensor(data)) return null;

  const lightningStatus = getLightningStatus(data);
  const recentStrike = lightningStatus === "strike";
  const lightningKm = data.lightning_km;
  const statusLabel = getLightningStatusLabel(data);

  return (
    <StationCard title="Bliksem">
      <div className="mb-3 flex items-center gap-2">
        <CloudLightning
          className={cn(
            "h-5 w-5 shrink-0",
            recentStrike && "text-accent-violet",
            lightningStatus === "risk" && "text-accent-energy",
            lightningStatus === "idle" && "text-accent-export"
          )}
        />
        <span className="text-sm font-medium text-foreground">{statusLabel}</span>
      </div>

      {recentStrike || lightningStatus === "risk" || lightningStatus === "airmass" ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {recentStrike ? (
            <Badge variant="violet">Recent</Badge>
          ) : lightningStatus === "risk" ? (
            <Badge variant="energy">Kans op onweer</Badge>
          ) : (
            <Badge variant="energy">Onweersgevoelig</Badge>
          )}
        </div>
      ) : null}

      {lightningKm != null && lightningKm > 0 ? (
        <MetricRow>
          <Metric label="Afstand" value={lightningKm} unit="km" accent="violet" />
          <Metric label="Vandaag" value={data.lightning_num ?? 0} accent="violet" />
          <Metric
            label="Laatste"
            value={data.lightning_time ? formatStrikeTime(data.lightning_time) : "—"}
          />
        </MetricRow>
      ) : null}
    </StationCard>
  );
}
