"use client";

import type { OpenWeatherSupplement } from "@/lib/api/types";
import { OpenWeatherSection } from "@/components/weather/OpenWeatherSection";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FetchError } from "@/lib/fetcher";

interface OpenWeatherPanelProps {
  data: OpenWeatherSupplement | null | undefined;
  error: FetchError | undefined;
  isLoading: boolean;
  onRetry: () => void;
}

export function OpenWeatherPanel({
  data,
  error,
  isLoading,
  onRetry,
}: OpenWeatherPanelProps) {
  if (data) {
    return <OpenWeatherSection data={data} />;
  }

  if (isLoading && !error) {
    return (
      <Card variant="weather">
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const notConfigured = error.status === 503;
    return (
      <Card variant="weather" className="border-dashed border-zinc-500/30">
        <CardContent className="text-center text-sm text-zinc-400">
          <p>
            {notConfigured
              ? "OpenWeather niet geconfigureerd. Zet OPENWEATHER_API_KEY in .env.local en herstart npm run dev."
              : error.message}
          </p>
          {!notConfigured && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300"
            >
              Opnieuw laden
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
