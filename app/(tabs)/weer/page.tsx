"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { MetricGrid } from "@/components/weather/MetricGrid";
import { TideCard } from "@/components/weather/TideCard";
import { KnmiWarningsCard } from "@/components/weather/KnmiWarningsCard";
import { OpenWeatherPanel } from "@/components/weather/OpenWeatherPanel";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { DataError } from "@/components/shared/DataError";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getAstronomyInfo, toAstronomieApi } from "@/lib/astronomy/sun-moon";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { useRevalidateOnVisible } from "@/lib/hooks/use-revalidate-on-visible";
import { normalizeOpenWeatherSupplement } from "@/lib/openweather/map";
import { getWeatherCondition } from "@/lib/utils/weather-condition";
import type {
  AstronomieApi,
  GetijdenResponse,
  KnmiWaarschuwingenApi,
  OpenWeatherSupplement,
  WeerHistorie,
  WeerLive,
} from "@/lib/api/types";

const TemperatureChart = dynamic(
  () =>
    import("@/components/weather/TemperatureChart").then((m) => m.TemperatureChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
);

const swrFreshOnOpen = {
  revalidateOnMount: true,
  revalidateOnFocus: true,
  revalidateIfStale: true,
  keepPreviousData: true,
} as const;

const defaultAstro: AstronomieApi = {
  period: "day",
  sunriseLabel: "—",
  sunsetLabel: "—",
  daylightHoursLabel: "—",
  sunProgress: 0.5,
  sunBelowHorizon: false,
  sunAltitudeDeg: 0,
  moon: { phase: 0.5, fraction: 0.5, label: "Maan", illuminationPct: 50 },
};

export default function WeerPage() {
  const {
    data: weer,
    error: weerError,
    isLoading: weerLoading,
    mutate: mutateWeer,
  } = useSWR<WeerLive, FetchError>("/api/weer/live", jsonFetcher, {
    refreshInterval: 30_000,
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
  const getijden = getijdenData?.items ?? [];
  const getijBron = getijdenData?.source ?? "rws";

  const { data: astro, mutate: mutateAstro } = useSWR<AstronomieApi>(
    "/api/weer/astronomie",
    jsonFetcher,
    { refreshInterval: 300_000, ...swrFreshOnOpen }
  );

  const { data: knmiWaarschuwingen, mutate: mutateKnmi } = useSWR<
    KnmiWaarschuwingenApi | null,
    FetchError
  >("/api/weer/knmi-waarschuwingen", knmiFetcher, {
    refreshInterval: 600_000,
    shouldRetryOnError: false,
    ...swrFreshOnOpen,
  });

  const {
    data: openWeather,
    error: openWeatherError,
    isLoading: openWeatherLoading,
    mutate: mutateOpenWeather,
  } = useSWR<OpenWeatherSupplement | null, FetchError>(
    "/api/weer/openweather",
    openWeatherFetcher,
    {
      refreshInterval: 1_800_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      dedupingInterval: 5_000,
      ...swrFreshOnOpen,
    }
  );

  const astroFallback = useMemo(() => {
    try {
      return toAstronomieApi(getAstronomyInfo());
    } catch {
      return defaultAstro;
    }
  }, []);

  const astroData = astro ?? astroFallback;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      mutateWeer(),
      mutateHistorie(),
      mutateGetijden(),
      mutateAstro(),
      mutateOpenWeather(),
      mutateKnmi(),
    ]);
  }, [mutateWeer, mutateHistorie, mutateGetijden, mutateAstro, mutateOpenWeather, mutateKnmi]);

  useRevalidateOnVisible(refreshAll);

  const updateLabel = weer?.server_timestamp
    ? `Update: ${String(weer.server_timestamp).replace("T", " ").slice(0, 16)}`
    : undefined;

  const condition = useMemo(
    () =>
      getWeatherCondition(
        weer ?? null,
        astroData.period,
        openWeather?.current,
        astroData.sunBelowHorizon
      ),
    [weer, astroData.period, astroData.sunBelowHorizon, openWeather?.current]
  );
  const showSkeleton = weerLoading && !weer && !weerError;

  return (
    <PullToRefresh onRefresh={refreshAll}>
      <header className="mb-4 text-center">
        <h1 className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-xl font-semibold text-transparent">
          Actueel weer
        </h1>
      </header>

      {showSkeleton ? (
        <WeerSkeleton />
      ) : weerError && !weer ? (
        <DataError message={weerError.message} onRetry={() => mutateWeer()} />
      ) : weer ? (
        <div className="space-y-4">
          <WeatherHero
            data={weer}
            condition={condition}
            astro={astroData}
            updateLabel={updateLabel}
          />
          {knmiWaarschuwingen ? <KnmiWarningsCard data={knmiWaarschuwingen} /> : null}
          <MetricGrid data={weer} />
          <OpenWeatherPanel
            data={openWeather}
            station={weer}
            error={openWeatherError}
            isLoading={openWeatherLoading}
            onRetry={() => mutateOpenWeather()}
          />
          {historie?.labels?.length ? <TemperatureChart data={historie} /> : null}
          <TideCard getijden={getijden} bron={getijBron} />
        </div>
      ) : (
        <DataError onRetry={() => mutateWeer()} />
      )}
    </PullToRefresh>
  );
}

async function knmiFetcher(url: string): Promise<KnmiWaarschuwingenApi | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 503) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new FetchError(body.error ?? "KNMI waarschuwingen niet beschikbaar", res.status);
  }
  return (await res.json()) as KnmiWaarschuwingenApi;
}

async function openWeatherFetcher(
  url: string
): Promise<OpenWeatherSupplement | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new FetchError(
      body.error ?? "OpenWeather niet geconfigureerd",
      503
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new FetchError(body.error ?? "OpenWeather niet beschikbaar", res.status);
  }
  const raw = (await res.json()) as Partial<OpenWeatherSupplement>;
  const normalized = normalizeOpenWeatherSupplement(raw);
  if (!normalized) {
    throw new FetchError("OpenWeather ongeldige response", 502);
  }
  return normalized;
}

function WeerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-80 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Card>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
