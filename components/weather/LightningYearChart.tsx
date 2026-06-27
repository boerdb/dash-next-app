"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeerBliksemJaarResponse } from "@/lib/api/types";
import { jsonFetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { chartTooltipStyle, useChartTheme } from "@/lib/hooks/use-chart-theme";

const CHART_HEIGHT = 200;
const COLOR_LIGHTNING = "#fbbf24";

function jaarUrl(jaar: number) {
  return `/api/weer/bliksem/jaar?jaar=${jaar}`;
}

function formatCount(n: number) {
  return `${Math.round(n)}`;
}

export function LightningYearChart() {
  const chartTheme = useChartTheme();
  const initJaar = Number(
    new Date().toLocaleString("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
    })
  );
  const [jaar, setJaar] = useState(initJaar);

  const { data, isLoading } = useSWR<WeerBliksemJaarResponse>(
    jaarUrl(jaar),
    jsonFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const chartData = useMemo(() => data?.maanden ?? [], [data]);
  const yMax = useMemo(() => {
    let max = 1;
    for (const m of chartData) {
      max = Math.max(max, m.ontadingen);
    }
    return Math.ceil(max * 1.15);
  }, [chartData]);

  const selectedMaand = useMemo(() => {
    if (!data || data.jaar !== jaar) return undefined;
    const m = Number(data.vandaag.slice(5, 7));
    return data.maanden[m - 1];
  }, [data, jaar]);

  if (isLoading && !data) {
    return null;
  }

  if (!data) {
    return (
      <Card variant="weather">
        <CardContent>
          <p className="text-sm text-surface-muted">Bliksemoverzicht niet beschikbaar.</p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = chartData.some((m) => m.ontadingen > 0);

  return (
    <Card variant="weather" className="border-amber-500/20">
      <CardContent>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-surface-muted">Ontladingen per maand</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!data.kan_vorige_jaar}
              onClick={() => setJaar(jaar - 1)}
              className="rounded-lg p-1.5 text-surface-muted hover:bg-surface-subtle disabled:opacity-30"
              aria-label="Vorig jaar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4rem] text-center text-sm font-medium text-foreground">
              {data.jaar}
            </span>
            <button
              type="button"
              disabled={!data.kan_volgende_jaar}
              onClick={() => setJaar(jaar + 1)}
              className="rounded-lg p-1.5 text-surface-muted hover:bg-surface-subtle disabled:opacity-30"
              aria-label="Volgend jaar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!hasAnyData && (
          <p className="mb-2 text-xs text-surface-muted">
            Nog geen gearchiveerde bliksemdagen — vult zich na WH57-detectie.
          </p>
        )}

        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                allowDecimals={false}
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v)}`}
              />
              <Tooltip
                cursor={{ fill: chartTheme.cursor }}
                contentStyle={{
                  ...chartTooltipStyle(chartTheme),
                  fontSize: 12,
                }}
                labelStyle={{ color: chartTheme.tooltipLabel }}
                itemStyle={{ color: "#fde68a" }}
                formatter={(value) => [
                  `${formatCount(Number(value))} ontladingen`,
                  "Bliksem",
                ]}
              />
              <Bar dataKey="ontadingen" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.maand}
                    fill={
                      selectedMaand?.maand === entry.maand
                        ? "#fde68a"
                        : COLOR_LIGHTNING
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <p className="mt-3 text-center text-sm text-surface-muted">
          Totaal {data.jaar}:{" "}
          <span className="font-semibold text-amber-300">
            {formatCount(data.jaar_totaal)} ontladingen
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
