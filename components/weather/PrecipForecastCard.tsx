"use client";

import { useId } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PrecipForecastResponse } from "@/lib/api/types";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_HEIGHT = 120;

export function PrecipForecastCard() {
  const gradientId = useId().replace(/:/g, "");
  const { data, error, isLoading, mutate } = useSWR<PrecipForecastResponse, FetchError>(
    "/api/weer/regen-voorspelling",
    jsonFetcher,
    { refreshInterval: 1_800_000, revalidateOnFocus: true }
  );

  if (isLoading && !data) {
    return (
      <Card variant="weather">
        <CardContent>
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card variant="weather" className="border-dashed border-zinc-500/30">
        <CardContent className="text-center text-sm text-zinc-300">
          <p>{error.message}</p>
          <button
            type="button"
            onClick={() => mutate()}
            className="mt-3 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300"
          >
            Opnieuw laden
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!data?.slots.length) return null;

  const chartData = data.slots.map((s) => ({
    label: s.label,
    mm: s.precipitationMm,
    pop: s.probabilityPct,
  }));

  return (
    <Card variant="weather" className="border-sky-500/20">
      <CardContent>
        <p className="mb-1 text-xs font-medium text-zinc-300">
          Verwachte neerslag · komende {data.hours} uur
        </p>
        <p className="mb-3 text-[0.65rem] text-zinc-300">
          Open-Meteo model · Harlingen · mm per uur
        </p>
        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, _name, item) => {
                  const pop = item.payload?.pop as number | null | undefined;
                  const mm = `${value} mm`;
                  return pop != null ? [`${mm} · ${pop}% kans`, "Neerslag"] : [mm, "Neerslag"];
                }}
              />
              <Bar
                dataKey="mm"
                fill={`url(#${gradientId})`}
                radius={[2, 2, 0, 0]}
                maxBarSize={6}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
