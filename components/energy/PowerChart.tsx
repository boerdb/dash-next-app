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
import type { EnergieHistorie } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";

interface PowerChartProps {
  data: EnergieHistorie;
}

const CHART_HEIGHT = 180;

export function PowerChart({ data }: PowerChartProps) {
  const fillId = useId().replace(/:/g, "");
  const chartData = data.labels.map((label, i) => ({
    label,
    watt: data.wattage[i] ?? 0,
  }));

  return (
    <Card variant="energy">
      <CardContent>
        <p className="mb-3 border-l-2 border-amber-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
          Verbruik afgelopen 24 uur (Watt)
        </p>
        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffce00" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ffce00" stopOpacity={0} />
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
              />
              <Area
                type="monotone"
                dataKey="watt"
                stroke="#ffce00"
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
