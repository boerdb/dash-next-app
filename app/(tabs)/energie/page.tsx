"use client";

import { useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { BatteryPanel } from "@/components/energy/BatteryPanel";
import { PowerHero } from "@/components/energy/PowerHero";
import { DailyStats } from "@/components/energy/DailyStats";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { DataError } from "@/components/shared/DataError";
import { Skeleton } from "@/components/ui/skeleton";
import { WeerSection } from "@/components/weather/WeerSection";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import type { EnergieHistorie, EnergieLive } from "@/lib/api/types";
import { applyLiveWattToHistorie } from "@/lib/energie/historie-24h";

const PowerChart = dynamic(
  () =>
    import("@/components/energy/PowerChart").then((m) => m.PowerChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
);

const BatteryChart = dynamic(
  () =>
    import("@/components/energy/BatteryChart").then((m) => m.BatteryChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-2xl" /> }
);

const MonthlyEnergyChart = dynamic(
  () =>
    import("@/components/energy/MonthlyEnergyChart").then(
      (m) => m.MonthlyEnergyChart
    ),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full rounded-2xl" /> }
);

export default function EnergiePage() {
  const {
    data: energie,
    error: energieError,
    isLoading,
    mutate: mutateEnergie,
  } = useSWR<EnergieLive, FetchError>("/api/energie/live", jsonFetcher, {
    refreshInterval: 3_000,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    keepPreviousData: true,
  });

  const { data: historie, mutate: mutateHistorie } = useSWR<EnergieHistorie, FetchError>(
    energie ? "/api/energie/historie" : null,
    jsonFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const chartHistorie = useMemo(
    () =>
      historie && energie
        ? applyLiveWattToHistorie(historie, energie.stroom_nu)
        : historie,
    [historie, energie?.stroom_nu]
  );

  const refreshAll = async () => {
    await Promise.all([mutateEnergie(), mutateHistorie()]);
  };

  const showSkeleton = isLoading && !energie && !energieError;
  const showBatteries =
    energie != null &&
    (energie.batterijen.length > 0 || (energie.batterij_historie?.labels?.length ?? 0) > 0);

  return (
    <PullToRefresh onRefresh={refreshAll}>
      {showSkeleton ? (
        <EnergieSkeleton />
      ) : energieError && !energie ? (
        <DataError
          message={energieError.message}
          onRetry={() => mutateEnergie()}
        />
      ) : energie ? (
        <div className="space-y-8 pb-2">
          <PowerHero data={energie} />

          <div className="grid gap-8 md:grid-cols-2 md:gap-6 md:items-start">
            <WeerSection title="Vandaag" subtitle="Stroom · gas · water">
              <DailyStats data={energie} />
            </WeerSection>

            {showBatteries ? (
              <WeerSection title="Batterijen" subtitle="HomeWizard · laadstrategie">
                <BatteryPanel data={energie} />
                <BatteryChart data={energie} />
              </WeerSection>
            ) : null}
          </div>

          <WeerSection
            title="Historie"
            subtitle="Grafieken en maandoverzicht"
            collapsible
            defaultOpen={false}
          >
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              {chartHistorie?.labels?.length ? (
                <PowerChart data={chartHistorie} />
              ) : null}
              <MonthlyEnergyChart />
            </div>
          </WeerSection>
        </div>
      ) : (
        <DataError onRetry={() => mutateEnergie()} />
      )}
    </PullToRefresh>
  );
}

function EnergieSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="-mx-4 h-56 w-[calc(100%+2rem)] rounded-b-3xl sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)]" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    </div>
  );
}
