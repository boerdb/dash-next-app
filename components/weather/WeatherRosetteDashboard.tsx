"use client";

import type { WeerHistorie, WeerLive } from "@/lib/api/types";
import { LightningPanel } from "@/components/weather/LightningPanel";
import { StationMetrics } from "@/components/weather/StationMetrics";
import { WindRosette } from "@/components/weather/WindRosette";

interface WeatherRosetteDashboardProps {
  data: WeerLive;
  historie?: WeerHistorie;
}

export function WeatherWindDashboard({ data }: { data: WeerLive }) {
  return <WindRosette data={data} />;
}

export function WeatherLightningDashboard({ data }: { data: WeerLive }) {
  return <LightningPanel data={data} />;
}

export function WeatherMetricsDashboard({ data, historie }: WeatherRosetteDashboardProps) {
  return <StationMetrics data={data} historie={historie} />;
}

export function WeatherRosetteDashboard({ data, historie }: WeatherRosetteDashboardProps) {
  return <StationMetrics data={data} historie={historie} />;
}
