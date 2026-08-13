"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { useLiveAstronomy } from "@/lib/hooks/use-live-astronomy";
import { useRevalidateOnVisible } from "@/lib/hooks/use-revalidate-on-visible";
import { hasActiveKnmiThunderWarning } from "@/lib/knmi/thunder";
import { getWeatherCondition } from "@/lib/utils/weather-condition";
import { formatWeerUpdateLabel } from "@/lib/weer/update-label";
import {
  LIGHTNING_POLL_ACTIVE_MS,
  LIGHTNING_POLL_NORMAL_MS,
  shouldAccelerateLightningPoll,
} from "@/lib/weer/lightning-storm";
import type {
  GetijdenResponse,
  KnmiWaarschuwingenApi,
  PrecipForecastResponse,
  WeerHistorie,
  WeerLive,
} from "@/lib/api/types";

const swrFreshOnOpen = {
  revalidateOnMount: true,
  revalidateOnFocus: true,
  revalidateIfStale: true,
  keepPreviousData: true,
} as const;

async function knmiFetcher(url: string): Promise<KnmiWaarschuwingenApi | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 503) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new FetchError(body.error ?? "KNMI waarschuwingen niet beschikbaar", res.status);
  }
  return (await res.json()) as KnmiWaarschuwingenApi;
}

export function useWeerData() {
  const {
    data: weer,
    error: weerError,
    isLoading: weerLoading,
    mutate: mutateWeer,
  } = useSWR<WeerLive, FetchError>("/api/weer/live", jsonFetcher, {
    refreshInterval: (latest) =>
      shouldAccelerateLightningPoll(latest)
        ? LIGHTNING_POLL_ACTIVE_MS
        : LIGHTNING_POLL_NORMAL_MS,
    dedupingInterval: 2_000,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    ...swrFreshOnOpen,
  });

  const { data: historie, mutate: mutateHistorie } = useSWR<WeerHistorie, FetchError>(
    "/api/weer/historie",
    jsonFetcher,
    { refreshInterval: 30_000, ...swrFreshOnOpen }
  );

  const { data: getijdenData, mutate: mutateGetijden } = useSWR<GetijdenResponse>(
    "/api/weer/getijden",
    jsonFetcher,
    { refreshInterval: 900_000, ...swrFreshOnOpen }
  );

  const astroData = useLiveAstronomy();

  const { data: knmiWaarschuwingen, mutate: mutateKnmi } = useSWR<
    KnmiWaarschuwingenApi | null,
    FetchError
  >("/api/weer/knmi-waarschuwingen", knmiFetcher, {
    refreshInterval: 600_000,
    shouldRetryOnError: false,
    ...swrFreshOnOpen,
  });

  const { data: openMeteoForecast, mutate: mutateForecast } = useSWR<
    PrecipForecastResponse,
    FetchError
  >("/api/weer/regen-voorspelling", jsonFetcher, {
    refreshInterval: 1_800_000,
    shouldRetryOnError: false,
    dedupingInterval: 5_000,
    ...swrFreshOnOpen,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      mutateWeer(),
      mutateHistorie(),
      mutateGetijden(),
      mutateKnmi(),
      mutateForecast(),
      swrMutate("/api/weer/radar"),
    ]);
  }, [mutateWeer, mutateHistorie, mutateGetijden, mutateKnmi, mutateForecast]);

  useRevalidateOnVisible(refreshAll);

  const updateLabel = formatWeerUpdateLabel(weer?.server_timestamp);

  const knmiThunder = useMemo(
    () => hasActiveKnmiThunderWarning(knmiWaarschuwingen),
    [knmiWaarschuwingen]
  );

  const condition = useMemo(
    () =>
      getWeatherCondition(
        weer ?? null,
        astroData.period,
        astroData.sunBelowHorizon,
        openMeteoForecast?.currentSky,
        knmiThunder
      ),
    [
      weer,
      astroData.period,
      astroData.sunBelowHorizon,
      openMeteoForecast?.currentSky,
      knmiThunder,
    ]
  );

  return {
    weer,
    weerError,
    weerLoading,
    historie,
    getijden: getijdenData?.items ?? [],
    getijBron: getijdenData?.source ?? "rws",
    astroData,
    knmiWaarschuwingen,
    openMeteoForecast,
    updateLabel,
    condition,
    refreshAll,
    mutateWeer,
  };
}
