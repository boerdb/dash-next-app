"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeerHistorie } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";

interface TemperatureChartProps {
  data: WeerHistorie;
}

const CHART_HEIGHT = 180;

export function TemperatureChart({ data }: TemperatureChartProps) {
  const fillId = useId().replace(/:/g, "");
  const chartData = data.labels.map((label, i) => ({
    label,
    temp: parseFloat(String(data.temperatures[i] ?? 0)),
  }));

  return (
    <Card variant="weather">
      <CardContent>
        <p className="mb-1 border-l-2 border-sky-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
          Temperatuur afgelopen 24 uur
        </p>
        <p className="mb-1 pl-2 text-[10px] text-zinc-500">
          Eigen weerstation · Ecowitt
        </p>
        <p className="mb-3 pl-2 text-sm text-zinc-500">
          Gemiddelde: <span className="font-semibold text-sky-400">{data.gemiddelde}°C</span>
        </p>
        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4da6ff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4da6ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#4da6ff"
                strokeWidth={2}
                fill={`url(#${fillId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
