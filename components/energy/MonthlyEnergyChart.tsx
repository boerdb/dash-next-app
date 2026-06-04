"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EnergieMaandDag, EnergieMaandResponse } from "@/lib/api/types";
import { dagTitelLang } from "@/lib/energie/maand-labels";
import { jsonFetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
const CHART_HEIGHT = 220;
const COLOR_NET = "#a78bfa";
const COLOR_BAT = "#38bdf8";
const COLOR_EXPORT = "#eab308";

function maandUrl(jaar: number, maand: number) {
  return `/api/energie/maand?jaar=${jaar}&maand=${maand}`;
}

function vorige(jaar: number, maand: number) {
  return maand === 1 ? { jaar: jaar - 1, maand: 12 } : { jaar, maand: maand - 1 };
}

function volgende(jaar: number, maand: number) {
  return maand === 12 ? { jaar: jaar + 1, maand: 1 } : { jaar, maand: maand + 1 };
}

function formatKwh(n: number) {
  return `${n.toFixed(2)} kWh`;
}

function DagDetail({ dag }: { dag: EnergieMaandDag }) {
  const verbruik = dag.net_in_kwh + dag.batterij_kwh;
  return (
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <div>
        <p className="text-sm font-medium text-white">{dagTitelLang(dag.dag)}</p>
        <p className="text-xs text-zinc-400">
          Verbruik {formatKwh(verbruik)}
          {dag.net_uit_kwh > 0 && (
            <span className="text-amber-300/90">
              {" "}
              · terug {formatKwh(dag.net_uit_kwh)}
            </span>
          )}
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-zinc-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLOR_NET }}
            />
            Van het net
          </span>
          <span className="font-medium text-white">{formatKwh(dag.net_in_kwh)}</span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-zinc-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLOR_BAT }}
            />
            Van batterijen
          </span>
          <span className="font-medium text-white">
            {formatKwh(dag.batterij_kwh)}
          </span>
        </li>
        {dag.net_uit_kwh > 0 ? (
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-zinc-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: COLOR_EXPORT }}
              />
              Terug naar net
            </span>
            <span className="font-medium text-amber-200">
              {formatKwh(dag.net_uit_kwh)}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function MonthlyEnergyChart() {
  const now = new Date();
  const initJaar = Number(
    now.toLocaleString("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
    })
  );
  const initMaand = Number(
    now.toLocaleString("en-CA", {
      timeZone: "Europe/Amsterdam",
      month: "numeric",
    })
  );

  const [jaar, setJaar] = useState(initJaar);
  const [maand, setMaand] = useState(initMaand);

  const { data, isLoading } = useSWR<EnergieMaandResponse>(
    maandUrl(jaar, maand),
    jsonFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.dagen.map((d) => ({
      ...d,
      net_uit_neg: d.net_uit_kwh > 0 ? -d.net_uit_kwh : 0,
      totaal_pos: d.net_in_kwh + d.batterij_kwh,
    }));
  }, [data]);

  const defaultIndex = useMemo(() => {
    if (!data) return -1;
    const i = data.dagen.findIndex((d) => d.dag === data.vandaag);
    return i >= 0 ? i : data.dagen.length - 1;
  }, [data]);

  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (defaultIndex >= 0) setSelectedIndex(defaultIndex);
  }, [defaultIndex, jaar, maand]);

  const selected =
    selectedIndex >= 0 && data ? data.dagen[selectedIndex] : undefined;

  const yMax = useMemo(() => {
    let max = 1;
    for (const d of chartData) {
      max = Math.max(max, d.totaal_pos, Math.abs(d.net_uit_neg));
    }
    return Math.ceil(max * 1.15 * 10) / 10;
  }, [chartData]);

  if (isLoading && !data) {
    return null;
  }

  if (!data || chartData.length === 0) {
    return (
      <Card variant="energy">
        <CardContent>
          <p className="text-sm text-zinc-400">
            Maandoverzicht vult zich na de eerste volledige dag met data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = chartData.some(
    (d) => d.net_in_kwh > 0 || d.batterij_kwh > 0 || d.net_uit_kwh > 0
  );

  return (
    <Card variant="energy">
      <CardContent>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="border-l-2 border-amber-500/50 pl-2 text-xs uppercase tracking-wide text-zinc-400">
            Verbruik per dag (kWh)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!data.kan_vorige_maand}
              onClick={() => {
                const p = vorige(jaar, maand);
                setJaar(p.jaar);
                setMaand(p.maand);
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
              aria-label="Vorige maand"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-medium text-zinc-200">
              {data.maand_label}
            </span>
            <button
              type="button"
              disabled={!data.kan_volgende_maand}
              onClick={() => {
                const n = volgende(jaar, maand);
                setJaar(n.jaar);
                setMaand(n.maand);
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
              aria-label="Volgende maand"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!hasAnyData && (
          <p className="mb-2 text-xs text-zinc-500">
            Nog geen dagtotalen — na middernacht verschijnen eerdere dagen; vandaag
            werkt direct mee.
          </p>
        )}

        <ChartContainer height={CHART_HEIGHT}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
              onClick={(state) => {
                const idx = state?.activeTooltipIndex;
                if (typeof idx === "number") setSelectedIndex(idx);
              }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
              />
              <YAxis
                domain={[-yMax, yMax]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.abs(Number(v)).toFixed(1)}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const v = Math.abs(Number(value));
                  const labels: Record<string, string> = {
                    net_in_kwh: "Van net",
                    batterij_kwh: "Batterij",
                    net_uit_neg: "Terug",
                  };
                  return [formatKwh(v), labels[String(name)] ?? name];
                }}
              />
              <Bar dataKey="net_in_kwh" stackId="pos" fill={COLOR_NET} radius={[0, 0, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={`n-${i}`}
                    fillOpacity={i === selectedIndex ? 1 : 0.75}
                  />
                ))}
              </Bar>
              <Bar dataKey="batterij_kwh" stackId="pos" fill={COLOR_BAT} radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={`b-${i}`}
                    fillOpacity={i === selectedIndex ? 1 : 0.75}
                  />
                ))}
              </Bar>
              <Bar dataKey="net_uit_neg" fill={COLOR_EXPORT} radius={[0, 0, 2, 2]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`u-${i}`}
                    fillOpacity={
                      i === selectedIndex ? 1 : entry.net_uit_kwh > 0 ? 0.8 : 0
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_NET }} />
            Net
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_BAT }} />
            Batterij
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_EXPORT }} />
            Teruglevering
          </span>
        </div>

        {selected ? (
          <DagDetail dag={selected} />
        ) : (
          <p className="mt-3 text-xs text-zinc-500">Tik op een dag voor details.</p>
        )}
      </CardContent>
    </Card>
  );
}
