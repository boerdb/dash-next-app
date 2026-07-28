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
import { Metric, MetricRow } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";

interface DailyStatsProps {
  data: EnergieLive;
}

export function DailyStats({ data }: DailyStatsProps) {
  const waterFlow = Number(data.water_actueel) > 0;
  const hasMeterstand = data.water_meterstand_label != null;
  const enphase = data.enphase;
  const showZon = enphase?.bereikbaar && enphase.vandaag_kwh != null;

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-6">
        <MetricRow className={showZon ? "sm:grid-cols-3" : "sm:grid-cols-2"}>
          {showZon ? (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-label text-surface-muted">
                <Sun className="h-3 w-3 text-accent-energy" />
                Zon vandaag
              </div>
              <Metric
                label=""
                value={enphase.vandaag_kwh}
                unit="kWh"
                accent="energy"
                className="[&>p:first-child]:hidden"
              />
              {enphase.vermogen_w != null && enphase.vermogen_w > 0 ? (
                <p className="text-caption text-surface-muted">Nu {enphase.vermogen_w} W</p>
              ) : null}
            </div>
          ) : null}
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-label text-surface-muted">
              <ArrowDownLeft className="h-3 w-3" />
              Ingekocht
            </div>
            <Metric
              label=""
              value={data.stroom_vandaag_in}
              unit="kWh"
              className="[&>p:first-child]:hidden"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-label text-surface-muted">
              <ArrowUpRight className="h-3 w-3 text-accent-export" />
              Teruggeleverd
            </div>
            <Metric
              label=""
              value={data.stroom_vandaag_uit}
              unit="kWh"
              accent="export"
              className="[&>p:first-child]:hidden"
            />
          </div>
        </MetricRow>

        <MetricRow>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-label text-surface-muted">
              <Flame className="h-3 w-3 text-accent-energy" />
              Gas
            </div>
            <Metric
              label=""
              value={data.gas_vandaag}
              unit="m³"
              accent="energy"
              className="[&>p:first-child]:hidden"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-label text-surface-muted">
              {waterFlow ? (
                <AlertCircle className="h-3 w-3 text-accent-danger" />
              ) : (
                <Droplets className="h-3 w-3 text-accent-weather" />
              )}
              Water
            </div>
            <Metric
              label=""
              value={data.water_vandaag}
              unit="L"
              accent={waterFlow ? "danger" : "weather"}
              className="[&>p:first-child]:hidden"
            />
            {waterFlow ? (
              <p className="text-caption text-accent-danger">Flow {data.water_actueel} L/min</p>
            ) : null}
          </div>
        </MetricRow>

        {hasMeterstand ? (
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-start gap-3">
              <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-accent-weather" />
              <div>
                <p className="text-label text-surface-muted">Watermeter (geschat)</p>
                <p className="text-metric mt-1 text-accent-weather">
                  {data.water_meterstand_label}{" "}
                  <span className="text-base font-normal text-surface-muted">m³</span>
                </p>
                <p className="text-caption mt-1 text-surface-muted">
                  Op basis van opgave 1404 m³ (8-2-2026) + sensorverbruik
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </SurfaceBody>
    </Surface>
  );
}
