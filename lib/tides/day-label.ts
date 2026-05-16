const TZ = "Europe/Amsterdam";

export function dagKeyAmsterdam(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function dagLabelAmsterdam(date: Date): string {
  const key = dagKeyAmsterdam(date);
  const today = dagKeyAmsterdam(new Date());
  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  const tomorrowKey = dagKeyAmsterdam(morgen);

  if (key === today) return "Vandaag";
  if (key === tomorrowKey) return "Morgen";
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}
