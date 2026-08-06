"use client";

import { useCallback } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { useRevalidateOnVisible } from "@/lib/hooks/use-revalidate-on-visible";
import type {
  ActionLogEntry,
  TahomaDevice,
  TahomaRule,
  TahomaStatus,
} from "@/lib/tahoma/types";

interface SettingsSafe {
  baseUrl: string;
  enabled: boolean;
  pollIntervalSec: number;
  hasToken: boolean;
  configured: boolean;
}

interface DevicesResponse {
  devices: TahomaDevice[];
  updatedAt: string;
}

interface RulesResponse {
  rules: TahomaRule[];
}

interface LogResponse {
  entries: ActionLogEntry[];
}

const REFRESH_MS = 30_000;

export function useTahomaStatus() {
  const { data, error, isLoading, mutate } = useSWR<TahomaStatus, FetchError>(
    "/api/tahoma/status",
    jsonFetcher,
    { revalidateOnMount: true, revalidateOnFocus: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { status: data, error, isLoading, mutate };
}

export function useTahomaDevices() {
  const { data, error, isLoading, mutate } = useSWR<DevicesResponse, FetchError>(
    "/api/tahoma/devices",
    jsonFetcher,
    { refreshInterval: REFRESH_MS, revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { devices: data?.devices ?? [], updatedAt: data?.updatedAt, error, isLoading, mutate };
}

export function useTahomaRules() {
  const { data, error, isLoading, mutate } = useSWR<RulesResponse, FetchError>(
    "/api/tahoma/rules",
    jsonFetcher,
    { revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { rules: data?.rules ?? [], error, isLoading, mutate };
}

export function useTahomaLog() {
  const { data, error, isLoading, mutate } = useSWR<LogResponse, FetchError>(
    "/api/tahoma/log",
    jsonFetcher,
    { revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { entries: data?.entries ?? [], error, isLoading, mutate };
}

export function useTahomaSettings() {
  const { data, error, isLoading, mutate } = useSWR<SettingsSafe, FetchError>(
    "/api/tahoma/settings",
    jsonFetcher,
    { revalidateOnMount: true, keepPreviousData: true },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { settings: data, error, isLoading, mutate };
}

/** Mutatie-helpers die na afloop de relevante SWR-caches vernieuwen. */
export async function refreshAllTahoma(): Promise<void> {
  await Promise.all([
    swrMutate("/api/tahoma/status"),
    swrMutate("/api/tahoma/devices"),
    swrMutate("/api/tahoma/rules"),
    swrMutate("/api/tahoma/log"),
  ]);
}
