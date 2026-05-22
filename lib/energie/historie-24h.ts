import type { EnergieHistorie } from "@/lib/api/types";

const TZ = "Europe/Amsterdam";

/** Sleutel per uur in Amsterdam (bijv. "2026-05-22 23") voor koppeling met DB-rijen. */
export function amsterdamHourKey(date: Date): string {
  return date
    .toLocaleString("sv-SE", { timeZone: TZ, hour12: false })
    .slice(0, 13);
}

/** Label voor grafiek-as (bijv. "23:00"). */
export function amsterdamHourLabel(date: Date): string {
  const hour = date.toLocaleString("nl-NL", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  });
  return `${hour.padStart(2, "0")}:00`;
}

export function buildLast24HourSlots(): { key: string; label: string }[] {
  const end = Date.now();
  const slots: { key: string; label: string }[] = [];
  for (let i = 23; i >= 0; i--) {
    const at = new Date(end - i * 3_600_000);
    slots.push({ key: amsterdamHourKey(at), label: amsterdamHourLabel(at) });
  }
  return slots;
}

export function buildHistorie24h(
  hourly: Map<string, number>,
  currentWatt?: number
): EnergieHistorie {
  const nowKey = amsterdamHourKey(new Date());
  const labels: string[] = [];
  const wattage: (number | null)[] = [];
  let totaal = 0;
  let count = 0;

  for (const slot of buildLast24HourSlots()) {
    labels.push(slot.label);
    let w = hourly.get(slot.key);
    if (slot.key === nowKey && currentWatt != null && Number.isFinite(currentWatt)) {
      w = Math.round(currentWatt);
    }
    if (w == null) {
      wattage.push(null);
    } else {
      wattage.push(w);
      totaal += w;
      count++;
    }
  }

  return {
    labels,
    wattage,
    gemiddelde: count > 0 ? Math.round(totaal / count) : 0,
  };
}

/** Werk het huidige uur bij met live vermogen (tussen historie-polls). */
export function applyLiveWattToHistorie(
  historie: EnergieHistorie,
  currentWatt?: number
): EnergieHistorie {
  if (currentWatt == null || !Number.isFinite(currentWatt)) {
    return historie;
  }
  const label = amsterdamHourLabel(new Date());
  const idx = historie.labels.lastIndexOf(label);
  if (idx < 0) {
    return historie;
  }
  const wattage = [...historie.wattage];
  wattage[idx] = Math.round(currentWatt);
  const nums = wattage.filter((w): w is number => w != null);
  return {
    ...historie,
    wattage,
    gemiddelde:
      nums.length > 0
        ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
        : historie.gemiddelde,
  };
}
