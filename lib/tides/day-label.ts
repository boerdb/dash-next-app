const TZ = "Europe/Amsterdam";

export function dagKeyAmsterdam(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Kalenderdag + n in Europe/Amsterdam (niet lokale server-tijd). */
export function addCalendarDaysAmsterdam(from: Date, days: number): string {
  const [y, m, d] = dagKeyAmsterdam(from).split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dagKeyAmsterdam(shifted);
}

export function dagLabelAmsterdam(date: Date, now = new Date()): string {
  const key = dagKeyAmsterdam(date);
  const today = dagKeyAmsterdam(now);
  const tomorrowKey = addCalendarDaysAmsterdam(now, 1);

  if (key === today) return "Vandaag";
  if (key === tomorrowKey) return "Morgen";
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export function dagLabelForKey(
  dagKey: string,
  now = new Date()
): "Vandaag" | "Morgen" | string {
  const today = dagKeyAmsterdam(now);
  const tomorrow = addCalendarDaysAmsterdam(now, 1);
  if (dagKey === today) return "Vandaag";
  if (dagKey === tomorrow) return "Morgen";
  return dagKey;
}
