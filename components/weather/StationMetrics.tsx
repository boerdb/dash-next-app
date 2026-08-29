"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { WeerHistorie, WeerLive } from "@/lib/api/types";
import { DailyRange } from "@/components/ui/daily-range";
import { Metric, MetricTrend } from "@/components/ui/metric";
import { LightningPanel } from "@/components/weather/LightningPanel";
import {
  DerivedMetric,
  RainList,
  StationCard,
  StationCol,
  StationSplit,
} from "@/components/weather/station-card";
import { WindRosette } from "@/components/weather/WindRosette";
import { formatBaromTrendDelta } from "@/lib/weer/barom-trend";
import { shouldShowHeatIndex } from "@/lib/weer/heat-index";
import { getLightningBattery } from "@/lib/weer/sensor-battery";
import { hasWh40Sensor, hasWs90Sensor } from "@/lib/weer/sensor-status";
import { regenMmFromWeer } from "@/lib/weer/regen-dag";
import { shouldShowWindChill } from "@/lib/weer/wind-chill-display";
import { resolveIlluminanceLux } from "@/lib/weer/ws90-lux";
import { resolveRainRateMm } from "@/lib/weer/ws90-rain";

function finiteNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatValue(value: unknown, decimals = 1, fallback = "—"): string {
  const n = finiteNumber(value);
  return n === null ? fallback : n.toFixed(decimals);
}

function formatMm(value: unknown): string {
  return formatValue(value, 1);
}

function TempHourlyTrend({ historie }: { historie?: WeerHistorie }) {
  const trend = useMemo(() => {
    const values = historie?.temperatures
      ?.map((value) => finiteNumber(value))
      .filter((value): value is number => value !== null);
    if (!values || values.length < 2) return null;
    const delta = Math.round((values[values.length - 1] - values[values.length - 2]) * 10) / 10;
    if (delta >= 0.3) return { delta, dir: "up" as const };
    if (delta <= -0.3) return { delta, dir: "down" as const };
    return { delta, dir: "neutral" as const };
  }, [historie]);

  if (!trend) return null;

  return (
    <MetricTrend
      className="mt-1.5"
      direction={trend.dir === "up" ? "up" : trend.dir === "down" ? "down" : "neutral"}
    >
      {trend.dir === "up" ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : trend.dir === "down" ? (
        <ArrowDownRight className="h-3.5 w-3.5" />
      ) : (
        <Minus className="h-3.5 w-3.5" />
      )}
      {trend.delta > 0 ? "+" : ""}
      {trend.delta.toFixed(1)} °C/u
    </MetricTrend>
  );
}

function OutdoorCard({ data, historie }: { data: WeerLive; historie?: WeerHistorie }) {
  const showWindChill = shouldShowWindChill(data);
  const showHitteIndex = shouldShowHeatIndex(data);
  const vpd = finiteNumber(data.vpd);

  return (
    <StationCard title="Buiten">
      <StationSplit>
        <StationCol>
          <Metric label="Temperatuur" value={formatValue(data.temp_c)} unit="°C" />
        </StationCol>
        <StationCol>
          <Metric label="Vochtigheid" value={data.humidity ?? "—"} unit="%" />
        </StationCol>
        <StationCol>
          <DailyRange
            min={data.temp_min_c}
            max={data.temp_max_c}
            minTime={data.temp_min_time}
            maxTime={data.temp_max_time}
            unit="°C"
            className="mt-2"
          />
        </StationCol>
        <StationCol>
          <DailyRange
            min={data.humidity_min}
            max={data.humidity_max}
            minTime={data.humidity_min_time}
            maxTime={data.humidity_max_time}
            unit="%"
            decimals={0}
            className="mt-2"
          />
        </StationCol>
        <StationCol className="pt-3">
          {showWindChill ? (
            <DerivedMetric
              label="Gevoel"
              value={formatValue(data.gevoelstemperatuur)}
              unit="°C"
            />
          ) : null}
          {showHitteIndex ? (
            <DerivedMetric
              label="Hitte-index"
              value={formatValue(data.hitte_index_c)}
              unit="°C"
            />
          ) : null}
          <TempHourlyTrend historie={historie} />
        </StationCol>
        <StationCol className="pt-3">
          <DerivedMetric
            label="Dauwpunt"
            value={formatValue(data.dauwpunt)}
            unit="°C"
          />
          {vpd !== null ? (
            <DerivedMetric label="VPD" value={vpd.toFixed(2)} unit="kPa" tone="export" />
          ) : null}
        </StationCol>
      </StationSplit>
    </StationCard>
  );
}

function IndoorCard({ data }: { data: WeerLive }) {
  if (data.tempin_c == null && data.humidityin == null) return null;

  return (
    <StationCard title="Binnen">
      <StationSplit>
        <StationCol>
          <Metric label="Temperatuur" value={formatValue(data.tempin_c)} unit="°C" />
          <DailyRange
            min={data.tempin_min_c}
            max={data.tempin_max_c}
            minTime={data.tempin_min_time}
            maxTime={data.tempin_max_time}
            unit="°C"
          />
        </StationCol>
        <StationCol>
          <Metric label="Vochtigheid" value={data.humidityin ?? "—"} unit="%" />
          <DailyRange
            min={data.humidityin_min}
            max={data.humidityin_max}
            minTime={data.humidityin_min_time}
            maxTime={data.humidityin_max_time}
            unit="%"
            decimals={0}
          />
        </StationCol>
      </StationSplit>
    </StationCard>
  );
}

function SolarCard({ data }: { data: WeerLive }) {
  const lux = resolveIlluminanceLux(data);

  return (
    <StationCard title="Zon en UV">
      <StationSplit>
        <StationCol>
          <Metric
            label="Zonstraling"
            value={formatValue(data.solarradiation, 0)}
            unit="W/m²"
          />
        </StationCol>
        <StationCol>
          <Metric label="UV-index" value={data.uv ?? "—"} />
        </StationCol>
        <StationCol>
          <DailyRange
            min={undefined}
            max={data.solar_max}
            maxTime={data.solar_max_time}
            unit="W/m²"
            decimals={0}
            className="mt-2"
          />
        </StationCol>
        <StationCol>
          <DailyRange
            min={undefined}
            max={data.uv_max}
            maxTime={data.uv_max_time}
            decimals={0}
            className="mt-2"
          />
        </StationCol>
        {hasWs90Sensor(data) && lux != null ? (
          <StationCol className="pt-3">
            <DerivedMetric
              label="Licht"
              value={formatValue(lux, 0)}
              unit="lux"
              tone="muted"
            />
          </StationCol>
        ) : null}
      </StationSplit>
    </StationCard>
  );
}

function RainCard({ data }: { data: WeerLive }) {
  const wh40 = hasWh40Sensor(data);
  const rainToday = regenMmFromWeer(data);
  const rainRate = resolveRainRateMm(data);
  const piezoToday = finiteNumber(data.dailyrain_piezo_mm);

  const rows = [
    { label: "Uur", value: formatMm(data.hourlyrain_mm) },
    { label: "24 uur", value: formatMm(data.last24hrain_mm) },
    { label: "Week", value: formatMm(data.weeklyrain_mm) },
    { label: "Maand", value: formatMm(data.monthlyrain_mm) },
    { label: "Jaar", value: formatMm(data.yearlyrain_mm) },
  ];
  if (wh40 && piezoToday !== null) {
    rows.push({ label: "Piezo WS90", value: piezoToday.toFixed(1) });
  }

  return (
    <StationCard title="Regen">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Metric
          label="Intensiteit"
          value={rainRate !== undefined ? rainRate.toFixed(1) : "—"}
          unit="mm/u"
          accent="weather"
        />
        <RainList rows={rows} className="row-span-2 self-center" />
        <Metric
          label="Vandaag"
          value={rainToday.toFixed(1)}
          unit="mm"
          accent="weather"
        />
      </div>
    </StationCard>
  );
}

function PressureCard({ data }: { data: WeerLive }) {
  const baromDir = data.barom_trend_direction ?? "steady";
  const baromDelta = finiteNumber(data.barom_trend_delta_hpa);
  const trend = baromDelta !== null ? (
    <MetricTrend
      className="mt-1.5"
      direction={baromDir === "up" ? "up" : baromDir === "down" ? "down" : "neutral"}
    >
      {baromDir === "up" ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : baromDir === "down" ? (
        <ArrowDownRight className="h-3.5 w-3.5" />
      ) : (
        <Minus className="h-3.5 w-3.5" />
      )}
      {formatBaromTrendDelta(baromDelta)} hPa · {data.barom_trend_hours ?? 3} u
    </MetricTrend>
  ) : null;

  return (
    <StationCard title="Luchtdruk">
      <StationSplit>
        <StationCol>
          <Metric
            label="Relatief"
            value={formatValue(data.baromrel_hpa)}
            unit="hPa"
          />
        </StationCol>
        <StationCol>
          <Metric
            label="Absoluut"
            value={formatValue(data.baromabs_hpa)}
            unit="hPa"
          />
        </StationCol>
        <StationCol>
          <DailyRange
            min={data.baromrel_min_hpa}
            max={data.baromrel_max_hpa}
            minTime={data.baromrel_min_time}
            maxTime={data.baromrel_max_time}
            unit="hPa"
            className="mt-2"
          />
        </StationCol>
        <StationCol>
          <DailyRange
            min={data.baromabs_min_hpa}
            max={data.baromabs_max_hpa}
            minTime={data.baromabs_min_time}
            maxTime={data.baromabs_max_time}
            unit="hPa"
            className="mt-2"
          />
        </StationCol>
        {trend ? <StationCol className="pt-3">{trend}</StationCol> : null}
      </StationSplit>
    </StationCard>
  );
}

function Channel2Card({ data }: { data: WeerLive }) {
  if (data.temp2_c == null && data.humidity2 == null) return null;

  return (
    <StationCard title="Kanaal 2">
      <StationSplit>
        {data.temp2_c != null ? (
          <StationCol>
            <Metric label="Temperatuur" value={formatValue(data.temp2_c)} unit="°C" />
          </StationCol>
        ) : null}
        {data.humidity2 != null ? (
          <StationCol>
            <Metric label="Vochtigheid" value={data.humidity2} unit="%" />
          </StationCol>
        ) : null}
      </StationSplit>
    </StationCard>
  );
}

function SensorsCard({ data }: { data: WeerLive }) {
  const ws90 = hasWs90Sensor(data);
  const wh40 = hasWh40Sensor(data);
  const lightningBattery = getLightningBattery(data);
  if (!ws90 && !wh40 && !lightningBattery) return null;

  return (
    <StationCard title="Sensoren">
      <div className="grid grid-cols-2 gap-4">
        {ws90 && data.ws90_voltage_v != null ? (
          <Metric label="WS90 batterij" value={`${data.ws90_voltage_v}`} unit="V" size="sm" />
        ) : null}
        {ws90 && data.ws90_cap_voltage_v != null ? (
          <Metric label="WS90 supercap" value={`${data.ws90_cap_voltage_v}`} unit="V" size="sm" />
        ) : null}
        {wh40 ? (
          <Metric label="WH40 batterij" value={`${data.wh40batt}`} unit="V" size="sm" />
        ) : null}
        {lightningBattery ? (
          <Metric
            label="WH57 batterij"
            value={lightningBattery.detail}
            size="sm"
            accent={lightningBattery.state === "low" ? "energy" : "default"}
          />
        ) : null}
      </div>
    </StationCard>
  );
}

export function StationMetrics({
  data,
  historie,
}: {
  data: WeerLive;
  historie?: WeerHistorie;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <OutdoorCard data={data} historie={historie} />
      <IndoorCard data={data} />
      <SolarCard data={data} />
      <WindRosette data={data} />
      <RainCard data={data} />
      <PressureCard data={data} />
      <LightningPanel data={data} />
      <Channel2Card data={data} />
      <SensorsCard data={data} />
    </div>
  );
}
