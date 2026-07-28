"use client";

import dynamic from "next/dynamic";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { Section } from "@/components/ui/section";
import { WindRosette } from "@/components/weather/WindRosette";
import { LightningPanel } from "@/components/weather/LightningPanel";
import { StationMetrics } from "@/components/weather/StationMetrics";
import { TideCard } from "@/components/weather/TideCard";
import { KnmiWarningsCard } from "@/components/weather/KnmiWarningsCard";
import { PrecipForecastCard } from "@/components/weather/PrecipForecastCard";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { StatusPanel } from "@/components/ui/status-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeerData } from "@/lib/hooks/use-weer";

const TemperatureChart = dynamic(
  () =>
    import("@/components/weather/TemperatureChart").then((m) => m.TemperatureChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);

const RainYearChart = dynamic(
  () =>
    import("@/components/weather/RainYearChart").then((m) => m.RainYearChart),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full" /> }
);

const LightningYearChart = dynamic(
  () =>
    import("@/components/weather/LightningYearChart").then(
      (m) => m.LightningYearChart
    ),
  { ssr: false, loading: () => <Skeleton className="h-52 w-full" /> }
);

const PrecipitationRadar = dynamic(
  () =>
    import("@/components/weather/PrecipitationRadar").then(
      (m) => m.PrecipitationRadar
    ),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

export default function WeerPage() {
  const {
    weer,
    weerError,
    weerLoading,
    historie,
    getijden,
    getijBron,
    astroData,
    knmiWaarschuwingen,
    openMeteoForecast,
    updateLabel,
    condition,
    refreshAll,
    mutateWeer,
  } = useWeerData();

  const showSkeleton = weerLoading && !weer && !weerError;

  return (
    <PullToRefresh onRefresh={refreshAll}>
      {showSkeleton ? (
        <WeerSkeleton />
      ) : weerError && !weer ? (
        <StatusPanel message={weerError.message} onRetry={() => mutateWeer()} />
      ) : weer ? (
        <div className="space-y-[var(--space-section)] pb-2">
          {knmiWaarschuwingen ? <KnmiWarningsCard data={knmiWaarschuwingen} /> : null}

          <WeatherHero
            data={weer}
            condition={condition}
            astro={astroData}
            updateLabel={updateLabel}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <WindRosette data={weer} />
            <LightningPanel data={weer} />
          </div>

          <Section title="Weerstation" subtitle="Ecowitt · live elke minuut" accent="weather">
            <StationMetrics data={weer} historie={historie} />
          </Section>

          <div className="grid gap-[var(--space-section)] lg:grid-cols-2">
            <Section title="Regenvoorspelling" subtitle="Open-Meteo · komende 48 uur" accent="weather">
              <PrecipForecastCard data={openMeteoForecast} />
            </Section>

            <Section title="Neerslagradar" subtitle="Nederland · RainViewer">
              <PrecipitationRadar />
            </Section>
          </div>

          <Section
            title="Historie"
            subtitle="Eigen weerstation"
            collapsible
            defaultOpen={false}
          >
            <div className="space-y-4">
              {historie?.labels?.length ? <TemperatureChart data={historie} /> : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <RainYearChart />
                <LightningYearChart />
              </div>
            </div>
          </Section>

          <Section
            title="Getij"
            subtitle="Harlingen · Waddenzee"
            collapsible
            defaultOpen={false}
          >
            <TideCard getijden={getijden} bron={getijBron} />
          </Section>
        </div>
      ) : (
        <StatusPanel onRetry={() => mutateWeer()} />
      )}
    </PullToRefresh>
  );
}

function WeerSkeleton() {
  return (
    <div className="space-y-[var(--space-section)]">
      <Skeleton className="-mx-4 h-72 rounded-b-[var(--radius-lg)] sm:-mx-6 lg:mx-0" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
