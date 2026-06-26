"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnergieLive } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { chartTooltipStyle, useChartTheme } from "@/lib/hooks/use-chart-theme";

interface BatteryChartProps {
  data: EnergieLive;
}

const CHART_HEIGHT = 160;
const SERIES_COLOR = "rgb(167, 139, 250)";

export function BatteryChart({ data }: BatteryChartProps) {
  const chartTheme = useChartTheme();
  const hist = data.batterij_historie;
  if (!hist?.labels?.length) return null;

  const fillId = useId().replace(/:/g, "");
  const chartData: { label: string; watt: number | null | undefined }[] = [];
  for (let i = 0; i < hist.labels.length; i++) {
    chartData.push({ label: hist.labels[i] ?? "", watt: hist.wattage[i] });
  }
  const pointCount = chartData.filter((d) => d.watt != null).length;

  return (
    <Card variant="energy" className="border-violet-500/15">
      <CardContent>
        <p className="mb-1 text-xs font-medium text-surface-muted">Batterijvermogen · 24 uur</p>
        <p className="mb-3 text-[0.65rem] text-surface-muted">
          Positief = laden · negatief = ontladen
        </p>
        {pointCount < 2 && (
          <p className="mb-2 text-xs text-surface-muted">
            Grafiek vult zich na elke 5 minuten metingen.
          </p>
        )}
        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <ReferenceLine y={0} stroke="rgba(167,139,250,0.3)" />
              <XAxis
                dataKey="label"
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                width={36}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  ...chartTooltipStyle(chartTheme),
                  border: "1px solid rgba(167,139,250,0.3)",
                }}
              />
              <Area
                type="monotone"
                dataKey="watt"
                stroke={SERIES_COLOR}
                fill={`url(#${fillId})`}
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
