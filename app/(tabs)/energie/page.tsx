"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { PowerHero } from "@/components/energy/PowerHero";
import { DailyStats } from "@/components/energy/DailyStats";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { DataError } from "@/components/shared/DataError";
import { Skeleton } from "@/components/ui/skeleton";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import type { EnergieHistorie, EnergieLive } from "@/lib/api/types";

const PowerChart = dynamic(
  () =>
    import("@/components/energy/PowerChart").then((m) => m.PowerChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
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
    { refreshInterval: 60_000 }
  );

  const refreshAll = async () => {
    await Promise.all([mutateEnergie(), mutateHistorie()]);
  };

  const showSkeleton = isLoading && !energie && !energieError;

  return (
    <PullToRefresh onRefresh={refreshAll}>
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-white">Energie dashboard</h1>
      </header>

      {showSkeleton ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : energieError && !energie ? (
        <DataError
          message={energieError.message}
          onRetry={() => mutateEnergie()}
        />
      ) : energie ? (
        <div className="space-y-4">
          <PowerHero data={energie} />
          <DailyStats data={energie} />
          {historie?.labels?.length ? <PowerChart data={historie} /> : null}
        </div>
      ) : (
        <DataError onRetry={() => mutateEnergie()} />
      )}
    </PullToRefresh>
  );
}
