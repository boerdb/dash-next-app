"use client";

import { useCallback } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { jsonFetcher, FetchError } from "@/lib/fetcher";
import { useRevalidateOnVisible } from "@/lib/hooks/use-revalidate-on-visible";
import type { HisenseStatus } from "@/lib/hisense/types";

export function useHisenseStatus() {
  const { data, error, isLoading, mutate } = useSWR<HisenseStatus, FetchError>(
    "/api/hisense/status",
    jsonFetcher,
    {
      // Alleen pollen als ConnectLife gekoppeld is; anders verandert er niets.
      refreshInterval: (latest) => (latest?.linked ? 30_000 : 0),
      revalidateOnMount: true,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );
  const revalidate = useCallback(() => void mutate(), [mutate]);
  useRevalidateOnVisible(revalidate);
  return { status: data, error, isLoading, mutate };
}

export async function refreshHisense(): Promise<void> {
  await swrMutate("/api/hisense/status");
}
