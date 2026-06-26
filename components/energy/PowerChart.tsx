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
import { chartTooltipStyle, useChartTheme } from "@/lib/hooks/use-chart-theme";

interface PowerChartProps {
  data: EnergieHistorie;
}

const CHART_HEIGHT = 180;
const SERIES_COLOR = "#ffce00";

export function PowerChart({ data }: PowerChartProps) {
  const chartTheme = useChartTheme();
  const fillId = useId().replace(/:/g, "");
  const chartData = data.labels.map((label, i) => ({
    label,
    watt: data.wattage[i],
  }));
  const pointCount = chartData.filter((d) => d.watt != null).length;
  const sparse = pointCount > 0 && pointCount < 8;

  return (
    <Card variant="energy">
      <CardContent>
        <p className="mb-1 text-xs font-medium text-surface-muted">Netvermogen · 24 uur</p>
        <p className="mb-3 text-[0.65rem] text-surface-muted">
          Positief = afname · negatief = teruglevering
        </p>
        {pointCount === 0 && (
          <p className="mb-2 text-xs text-surface-muted">
            Nog geen historie — vult zich elke 5 minuten (ook als dit scherm dicht is).
          </p>
        )}
        {pointCount > 0 && pointCount < 4 && (
          <p className="mb-2 text-xs text-surface-muted">
            Beperkte historie — oudere uren zonder data blijven leeg; nieuwe punten komen elke 5 min bij.
          </p>
        )}
        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={chartTooltipStyle(chartTheme)} />
              <Area
                type="monotone"
                dataKey="watt"
                stroke={SERIES_COLOR}
                strokeWidth={2}
                fill={`url(#${fillId})`}
                connectNulls={false}
                dot={sparse ? { r: 3, fill: SERIES_COLOR, strokeWidth: 0 } : false}
                activeDot={{ r: 4, fill: "#fde68a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
