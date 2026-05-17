"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpenWeatherMinutely } from "@/lib/api/types";
import { ChartContainer } from "@/components/ui/chart-container";

const CHART_HEIGHT = 100;

interface OpenWeatherMinutelyChartProps {
  data: OpenWeatherMinutely[];
}

export function OpenWeatherMinutelyChart({ data }: OpenWeatherMinutelyChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const chartData = data.map((m) => ({
    label: m.label,
    mm: m.precipitationMm,
  }));

  return (
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
            formatter={(value) => [`${value} mm`, "Neerslag"]}
          />
          <Bar
            dataKey="mm"
            fill={`url(#${gradientId})`}
            radius={[2, 2, 0, 0]}
            maxBarSize={8}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
