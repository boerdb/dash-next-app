"use client";

import { Cloud, Droplets, Eye, Thermometer } from "lucide-react";
import type { OpenWeatherSupplement } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OpenWeatherSectionProps {
  data: OpenWeatherSupplement;
}

export function OpenWeatherSection({ data }: OpenWeatherSectionProps) {
  const { current, hourly, daily } = data;

  return (
    <Card>
      <CardContent className="space-y-4">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Voorspelling & aanvulling
          </p>
          <p className="mt-0.5 text-[0.65rem] text-zinc-500">
            OpenWeather · Harlingen · bepaalt ook luchtbeeld bovenaan
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          {current.icon ? (
            <img
              src={current.icon}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12"
            />
          ) : null}
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-sm font-medium capitalize text-zinc-200">
              {current.description}
            </p>
            <p className="text-[0.65rem] text-zinc-500">Regio (model), niet je sensor</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SupplementChip
            icon={Eye}
            label="Zicht"
            value={
              current.visibilityKm != null
                ? `${current.visibilityKm} km`
                : "—"
            }
          />
          <SupplementChip
            icon={Cloud}
            label="Bewolking"
            value={`${current.cloudsPct}%`}
          />
          <SupplementChip
            icon={Droplets}
            label="Luchtvocht"
            value={`${current.humidityPct}%`}
          />
          <SupplementChip
            icon={Thermometer}
            label="Dauwpunt"
            value={
              current.dewPointC != null ? `${current.dewPointC}°C` : "—"
            }
          />
        </div>

        {hourly.length > 0 && (
          <section>
            <p className="mb-2 text-[0.65rem] uppercase tracking-wide text-zinc-500">
              Komende uren (elke 3 u)
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {hourly.map((h) => (
                <HourlyChip key={h.at} item={h} />
              ))}
            </div>
          </section>
        )}

        {daily.length > 0 && (
          <section>
            <p className="mb-2 text-[0.65rem] uppercase tracking-wide text-zinc-500">
              5-daagse voorspelling
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {daily.map((d) => (
                <DailyChip key={d.dagKey} item={d} />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[0.6rem] text-zinc-600">
          Data: OpenWeather · ververst ca. elk half uur
        </p>
      </CardContent>
    </Card>
  );
}

function SupplementChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/5 bg-black/30 px-2 py-2.5 text-center">
      <Icon className="mb-1 h-4 w-4 text-sky-400/80" />
      <span className="text-[0.6rem] uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-200">
        {value}
      </span>
    </div>
  );
}

function HourlyChip({
  item,
}: {
  item: OpenWeatherSupplement["hourly"][number];
}) {
  return (
    <div className="flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border border-white/10 bg-black/30 px-2 py-2">
      <span className="text-[0.65rem] font-medium text-zinc-400">{item.label}</span>
      {item.icon ? (
        <img src={item.icon} alt="" width={36} height={36} className="my-0.5 h-9 w-9" />
      ) : null}
      <span className="text-sm font-bold tabular-nums text-white">{item.tempC}°</span>
      <span
        className={cn(
          "text-[0.65rem] tabular-nums",
          item.popPct >= 50 ? "text-sky-300" : "text-zinc-500"
        )}
      >
        {item.popPct}% regen
      </span>
    </div>
  );
}

function DailyChip({
  item,
}: {
  item: OpenWeatherSupplement["daily"][number];
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-black/30 px-2 py-2.5 text-center">
      <span className="text-[0.65rem] font-semibold uppercase text-zinc-400">
        {item.label}
      </span>
      {item.icon ? (
        <img src={item.icon} alt="" width={40} height={40} className="my-1 h-10 w-10" />
      ) : null}
      <span className="text-xs font-bold tabular-nums text-white">
        {item.tempMinC}° / {item.tempMaxC}°
      </span>
      <span
        className={cn(
          "mt-0.5 text-[0.6rem]",
          item.popPct >= 40 ? "text-sky-300" : "text-zinc-500"
        )}
      >
        {item.popPct}%
      </span>
    </div>
  );
}
