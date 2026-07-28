"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { applyLiveWattToHistorie } from "@/lib/energie/historie-24h";
import type { EnergieHistorie, EnergieLive } from "@/lib/api/types";

export function useEnergieData() {
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

  const showBatteries =
    energie != null &&
    (energie.batterijen.length > 0 || (energie.batterij_historie?.labels?.length ?? 0) > 0);

  return {
    energie,
    energieError,
    isLoading,
    historie,
    chartHistorie,
    showBatteries,
    refreshAll,
    mutateEnergie,
  };
}
