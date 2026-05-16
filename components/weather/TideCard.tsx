"use client";

import { Fragment } from "react";
import { HelpCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { GetijItem } from "@/lib/api/types";
import {
  berekenVerschil,
  getActiveTideIndex,
  getLiveStatus,
} from "@/lib/utils/tides";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TideCardProps {
  getijden: GetijItem[];
}

export function TideCard({ getijden }: TideCardProps) {
  if (!getijden.length) return null;

  const status = getLiveStatus(getijden);
  const activeIndex = getActiveTideIndex(getijden);
  const StatusIcon =
    status.icoon === "up"
      ? TrendingUp
      : status.icoon === "down"
        ? TrendingDown
        : HelpCircle;

  const statusColor =
    status.kleur === "success"
      ? "text-emerald-400 bg-emerald-500/10"
      : status.kleur === "danger"
        ? "text-rose-400 bg-rose-500/10"
        : "text-zinc-400 bg-zinc-500/10";

  return (
    <Card>
      <CardContent>
        <p className="mb-2 text-center text-[0.65rem] text-zinc-500">
          Vandaag en morgen · Harlingen
        </p>
        <div
          className={`mb-4 flex items-center justify-center gap-3 rounded-xl px-4 py-3 ${statusColor}`}
        >
          <StatusIcon className="h-6 w-6 shrink-0" />
          <span className="text-sm font-bold uppercase tracking-wide">
            {status.tekst}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 border-b border-white/10 pb-2 text-[0.65rem] uppercase text-zinc-500">
          <span>Getij</span>
          <span>Tijd</span>
          <span className="text-center">Verschil</span>
          <span className="text-right">Hoogte</span>
        </div>

        {getijden.map((g, i) => {
          const isActive = i === activeIndex;
          const showDayHeader =
            i === 0 || getijden[i - 1].dagKey !== g.dagKey;
          return (
            <Fragment key={`${g.dagKey}-${g.type}-${g.tijd}`}>
              {showDayHeader && (
                <p className="border-b border-white/10 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-400 first:pt-0">
                  {g.dagLabel}
                </p>
              )}
              <div
                className={cn(
                  "grid grid-cols-4 gap-2 border-b border-white/5 py-3 text-sm transition-colors",
                  isActive &&
                    "rounded-xl border border-sky-400/40 bg-sky-500/15 px-2 -mx-2 shadow-[0_0_20px_-8px_rgba(56,189,248,0.6)]"
                )}
              >
                <span className={cn("font-semibold", isActive && "text-sky-300")}>
                  {g.type === "HW" ? "Vloed" : "Eb"}
                  {isActive && (
                    <span className="ml-1.5 rounded bg-sky-500/30 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-sky-200">
                      Nu
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-zinc-200",
                    isActive && "font-semibold text-white"
                  )}
                >
                  {g.tijd}
                </span>
                <span
                  className={cn(
                    "text-center text-xs",
                    g.type === "HW" ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {berekenVerschil(i, getijden)}
                </span>
                <span
                  className={cn(
                    "text-right font-semibold text-sky-400",
                    isActive && "text-sky-300"
                  )}
                >
                  {g.hoogte}m
                </span>
              </div>
            </Fragment>
          );
        })}

        <p className="mt-3 text-center text-[0.65rem] text-zinc-500">
          Getij: Open-Meteo · Harlingen (voorspeld)
        </p>
      </CardContent>
    </Card>
  );
}
