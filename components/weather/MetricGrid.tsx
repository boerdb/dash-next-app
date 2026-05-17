"use client";

import {
  ArrowUp,
  Droplets,
  Gauge,
  Home,
  Sun,
} from "lucide-react";
import type { WeerLive } from "@/lib/api/types";
import { getWindDirection } from "@/lib/utils/wind";
import { Card, CardContent } from "@/components/ui/card";

interface MetricGridProps {
  data: WeerLive;
}

function MetricCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card variant="weather" className={className}>
      <CardContent className="flex flex-col items-center justify-center text-center">
        {children}
      </CardContent>
    </Card>
  );
}

export function MetricGrid({ data }: MetricGridProps) {
  const windDeg = data.winddir ?? 0;
  const uv = Number(data.uv ?? 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard>
          <ArrowUp
            className="h-8 w-8 text-sky-400 transition-transform duration-700"
            style={{ transform: `rotate(${windDeg}deg)` }}
          />
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
            Wind ({getWindDirection(data.winddir)})
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {Number(data.windspd_avg10m_kmh ?? 0).toFixed(1)}
            <span className="ml-1 text-sm font-normal text-zinc-400">km/u</span>
          </p>
          <p className="text-xs text-zinc-400">
            Stoot: {Number(data.windgust_kmh ?? 0).toFixed(1)} km/u
          </p>
        </MetricCard>

        <MetricCard>
          <Droplets className="h-8 w-8 text-blue-400" />
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">Regen</p>
          <p className="text-2xl font-bold tabular-nums">
            {Number(data.dailyrain_mm ?? 0).toFixed(1)}
            <span className="ml-1 text-sm font-normal text-zinc-400">mm</span>
          </p>
          <p className="text-xs text-zinc-400">Vandaag</p>
          <p className="text-xs text-zinc-500">Mnd: {data.monthlyrain_mm} mm</p>
          <p className="text-xs text-zinc-500">Jaar: {data.yearlyrain_mm} mm</p>
        </MetricCard>

        <MetricCard>
          <Gauge className="h-8 w-8 text-violet-400" />
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">Luchtdruk</p>
          <p className="text-2xl font-bold tabular-nums">
            {Number(data.baromrel_hpa ?? 0).toFixed(1)}
            <span className="ml-1 text-sm font-normal text-zinc-400">hPa</span>
          </p>
          <p className="text-xs text-zinc-400">Relatief</p>
        </MetricCard>

        <MetricCard>
          <Sun className="h-8 w-8 text-amber-400" />
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">Zon & UV</p>
          <p className={`text-2xl font-bold ${uv >= 3 ? "text-amber-400" : ""}`}>{data.uv}</p>
          <p className="text-xs text-zinc-400">
            Straling: {Number(data.solarradiation ?? 0).toFixed(0)} W/m²
          </p>
        </MetricCard>
      </div>

      <Card variant="weather">
        <CardContent className="flex flex-wrap items-center justify-center gap-3 text-center">
          <Home className="h-5 w-5 text-emerald-400" />
          <span className="text-xs uppercase text-zinc-400">Binnen:</span>
          <strong className="text-lg text-sky-100">{data.tempin_c}°C</strong>
          <span className="text-zinc-600">|</span>
          <span className="text-xs uppercase text-zinc-400">Vocht:</span>
          <strong className="text-lg text-cyan-200">{data.humidityin}%</strong>
        </CardContent>
      </Card>
    </div>
  );
}
