"use client";

import { useEffect } from "react";
import { preload } from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import type { EnergieHistorie, EnergieLive } from "@/lib/api/types";

const LIVE_KEY = "/api/energie/live";
const HISTORIE_KEY = "/api/energie/historie";

function prefetchEnergie() {
  void preload<EnergieLive>(LIVE_KEY, jsonFetcher);
  void preload<EnergieHistorie>(HISTORIE_KEY, jsonFetcher);
}

/** Laadt energiedata op de achtergrond zodat de Energie-tab sneller opent. */
export function EnergiePrefetch() {
  useEffect(() => {
    prefetchEnergie();
    const interval = setInterval(prefetchEnergie, 5_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
