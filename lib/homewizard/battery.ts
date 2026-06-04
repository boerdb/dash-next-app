export interface HomeWizardBatteryRaw {
  active_power_w?: number;
  state_of_charge?: number;
  state_of_charge_pct?: number;
  battery_percentage?: number;
}

export interface BatterijLive {
  id: string;
  soc: number | null;
  vermogen_w: number;
  bereikbaar: boolean;
}

export const DEFAULT_BATTERY_URLS = [
  "http://192.168.1.179/api/v1/data",
  "http://192.168.1.170/api/v1/data",
] as const;

export function parseBatteryUrls(value: string | undefined): string[] {
  if (value === "") return [];
  if (!value?.trim()) return [...DEFAULT_BATTERY_URLS];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Laatste octet van het IP (bijv. 179 uit 192.168.1.179). */
export function batteryIdFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    return parts[parts.length - 1] ?? host;
  } catch {
    return url;
  }
}

export function parseSoc(raw: HomeWizardBatteryRaw): number | null {
  const candidates = [
    raw.state_of_charge,
    raw.state_of_charge_pct,
    raw.battery_percentage,
  ];
  for (const v of candidates) {
    if (v == null || Number.isNaN(Number(v))) continue;
    const n = Number(v);
    if (n >= 0 && n <= 100) return Math.round(n);
  }
  return null;
}

export function mapBatteryRaw(
  raw: HomeWizardBatteryRaw | null,
  id: string
): BatterijLive {
  if (!raw) {
    return { id, soc: null, vermogen_w: 0, bereikbaar: false };
  }
  return {
    id,
    soc: parseSoc(raw),
    vermogen_w: Math.round(Number(raw.active_power_w ?? 0)),
    bereikbaar: true,
  };
}

export function aggregateBatterijen(batterijen: BatterijLive[]): {
  vermogen_totaal: number;
  soc_gemiddeld: number | null;
} {
  const online = batterijen.filter((b) => b.bereikbaar);
  const vermogen_totaal = online.reduce((s, b) => s + b.vermogen_w, 0);
  const socs = online.map((b) => b.soc).filter((s): s is number => s != null);
  const soc_gemiddeld =
    socs.length > 0
      ? Math.round(socs.reduce((a, b) => a + b, 0) / socs.length)
      : null;
  return { vermogen_totaal, soc_gemiddeld };
}
