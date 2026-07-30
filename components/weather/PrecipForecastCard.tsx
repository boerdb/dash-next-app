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
import type { PrecipForecastResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { ChartFrame } from "@/components/ui/chart-frame";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { chartTooltipStyle, useChartTheme } from "@/lib/hooks/use-chart-theme";

const CHART_HEIGHT = 180;

function precipYMax(slots: { mm: number }[]): number {
  const max = Math.max(0, ...slots.map((s) => s.mm));
  if (max <= 0) return 1;
  if (max < 0.5) return 0.5;
  return Math.ceil(max * 1.15 * 10) / 10;
}

function formatPrecipTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const formatted = n < 1 && n > 0 ? n.toFixed(1) : Number.isInteger(n) ? `${n}` : n.toFixed(1);
  return `${formatted} mm`;
}

function formatTooltipMm(mm: number, pop: number | null | undefined): string {
  const mmText = `${mm} mm`;
  return pop != null ? `${mmText} · ${pop}% kans` : mmText;
}

interface PrecipForecastCardProps {
  data?: PrecipForecastResponse | null;
  error?: string;
  onRetry?: () => void;
}

export function PrecipForecastCard({ data, error, onRetry }: PrecipForecastCardProps) {
  const chartTheme = useChartTheme();
  const gradientId = useId().replace(/:/g, "");

  if (error && !data) {
    return (
      <Surface level="flat">
        <SurfaceBody className="text-center text-sm text-surface-muted">
          <p>{error}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3">
              Opnieuw laden
            </Button>
          ) : null}
        </SurfaceBody>
      </Surface>
    );
  }

  if (!data?.slots.length) return null;

  // Unieke x-sleutel (at) — labels herhalen (do 12:00 én vr 12:00 = "12:00")
  // waardoor Recharts de tooltip aan het verkeerde (droge) uur koppelde.
  const chartData = data.slots.map((s) => ({
    at: s.at,
    label: s.label,
    mm: s.precipitationMm,
    pop: s.probabilityPct,
  }));
  const yMax = precipYMax(chartData);
  const tipStyle = chartTooltipStyle(chartTheme);

  return (
    <Surface level="raised">
      <SurfaceBody>
        <p className="text-caption mb-4 text-surface-muted">
          Verwachte neerslag · komende {data.hours} uur · mm per uur
        </p>
        <ChartFrame height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartTheme.rain} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartTheme.rain} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="at"
                tick={{ fill: chartTheme.tick, fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value) =>
                  chartData.find((d) => d.at === value)?.label ?? ""
                }
              />
              <YAxis
                domain={[0, yMax]}
                allowDecimals
                tick={{ fill: chartTheme.tick, fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={formatPrecipTick}
              />
              <Tooltip
                cursor={{ fill: chartTheme.cursor }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const point = payload[0].payload as {
                    label: string;
                    mm: number;
                    pop: number | null;
                  };
                  return (
                    <div
                      style={{
                        ...tipStyle,
                        fontSize: 12,
                        padding: "8px 10px",
                        color: chartTheme.tooltipLabel,
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 600 }}>{point.label}</p>
                      <p style={{ margin: "4px 0 0" }}>
                        Neerslag: {formatTooltipMm(point.mm, point.pop)}
                      </p>
                    </div>
                  );
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
        </ChartFrame>
      </SurfaceBody>
    </Surface>
  );
}
