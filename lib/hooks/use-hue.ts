"use client";

import { useCallback } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { useRevalidateOnVisible } from "@/lib/hooks/use-revalidate-on-visible";
import type { HueLight, HueStatus } from "@/lib/hue/types";

interface SettingsSafe {
  bridgeIp: string;
  hasUsername: boolean;
  configured: boolean;
}

interface LightsResponse {
  lights: HueLight[];
  updatedAt: string;
}

const REFRESH_MS = 15_000;

export function useHueStatus() {
  const { data, error, isLoading, mutate } = useSWR<HueStatus, FetchError>(
    "/api/hue/status",
    jsonFetcher,
    { revalidateOnMount: true, revalidateOnFocus: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { status: data, error, isLoading, mutate };
}

export function useHueLights() {
  const { data, error, isLoading, mutate } = useSWR<LightsResponse, FetchError>(
    "/api/hue/lights",
    jsonFetcher,
    { refreshInterval: REFRESH_MS, revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { lights: data?.lights ?? [], updatedAt: data?.updatedAt, error, isLoading, mutate };
}

export function useHueSettings() {
  const { data, error, isLoading, mutate } = useSWR<SettingsSafe, FetchError>(
    "/api/hue/settings",
    jsonFetcher,
    { revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { settings: data, error, isLoading, mutate };
}

export async function refreshAllHue(): Promise<void> {
  await Promise.all([
    swrMutate("/api/hue/status"),
    swrMutate("/api/hue/lights"),
  ]);
}

/** Hue bri (1–254) → percentage voor UI. */
export function briToPercent(bri: number | null): number {
  if (bri == null || bri <= 0) return 0;
  return Math.round((bri / 254) * 100);
}

/** UI-percentage → Hue bri (1–254). */
export function percentToBri(percent: number): number {
  if (percent <= 0) return 1;
  return Math.max(1, Math.round((percent / 100) * 254));
}
