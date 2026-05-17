import type { GetijItem } from "@/lib/api/types";
import { fetchHarlingenTidesOpenMeteo } from "./open-meteo-client";
import { fetchHarlingenTidesRws } from "./rws-client";

export type TideSource = "rws" | "open-meteo";

export interface FetchTidesResult {
  items: GetijItem[];
  source: TideSource;
}

/** Rijkswaterstaat astronomisch getij; valt terug op Open-Meteo bij storing. */
export async function fetchHarlingenTides(): Promise<FetchTidesResult> {
  try {
    const items = await fetchHarlingenTidesRws();
    return { items, source: "rws" };
  } catch (err) {
    console.warn("RWS getijden niet beschikbaar, fallback Open-Meteo:", err);
    const items = await fetchHarlingenTidesOpenMeteo();
    return { items, source: "open-meteo" };
  }
}
