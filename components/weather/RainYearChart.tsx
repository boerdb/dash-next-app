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
import type { WeerRegenJaarResponse } from "@/lib/api/types";
import { jsonFetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";

const CHART_HEIGHT = 200;
const COLOR_RAIN = "#38bdf8";

function jaarUrl(jaar: number) {
  return `/api/weer/regen/jaar?jaar=${jaar}`;
}

function formatMm(n: number) {
  return `${n.toFixed(1)} mm`;
}

export function RainYearChart() {
  const initJaar = Number(
    new Date().toLocaleString("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
    })
  );
  const [jaar, setJaar] = useState(initJaar);

  const { data, isLoading } = useSWR<WeerRegenJaarResponse>(
    jaarUrl(jaar),
    jsonFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const chartData = useMemo(() => data?.maanden ?? [], [data]);
  const yMax = useMemo(() => {
    let max = 1;
    for (const m of chartData) {
      max = Math.max(max, m.regen_mm);
    }
    return Math.ceil(max * 1.15 * 10) / 10;
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
          <p className="text-sm text-zinc-400">Regenoverzicht niet beschikbaar.</p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = chartData.some((m) => m.regen_mm > 0);

  return (
    <Card variant="weather" className="border-sky-500/20">
      <CardContent>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="border-l-2 border-sky-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
            Regen per maand (mm)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!data.kan_vorige_jaar}
              onClick={() => setJaar(jaar - 1)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
              aria-label="Vorig jaar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4rem] text-center text-sm font-medium text-zinc-200">
              {data.jaar}
            </span>
            <button
              type="button"
              disabled={!data.kan_volgende_jaar}
              onClick={() => setJaar(jaar + 1)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
              aria-label="Volgend jaar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mb-3 pl-2 text-[10px] text-zinc-500">
          Eigen weerstation · Ecowitt · opgebouwd uit dagtotalen
        </p>

        {!hasAnyData && (
          <p className="mb-2 text-xs text-zinc-500">
            Nog geen gearchiveerde regendagen — vult zich na ingest en backfill uit
            metingen.
          </p>
        )}

        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v)}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [formatMm(Number(value)), "Regen"]}
              />
              <Bar dataKey="regen_mm" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.maand}
                    fill={
                      selectedMaand?.maand === entry.maand
                        ? "#7dd3fc"
                        : COLOR_RAIN
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <p className="mt-3 text-center text-sm text-zinc-400">
          Totaal {data.jaar}:{" "}
          <span className="font-semibold text-sky-300">
            {formatMm(data.jaar_totaal_mm)}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
