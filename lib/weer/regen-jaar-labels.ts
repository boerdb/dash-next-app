const MONTH_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

const TZ = "Europe/Amsterdam";

export function todayAmsterdamDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function currentJaarAmsterdam(): number {
  return Number(
    new Date().toLocaleString("en-CA", { timeZone: TZ, year: "numeric" })
  );
}

export function parseJaar(jaarRaw: string | null): number | null {
  if (jaarRaw == null || jaarRaw === "") {
    return currentJaarAmsterdam();
  }
  const jaar = Number(jaarRaw);
  if (!Number.isInteger(jaar) || jaar < 2000 || jaar > 2100) return null;
  return jaar;
}

export function maandLabelShort(maand: number): string {
  return MONTH_SHORT[maand - 1] ?? String(maand);
}

export function jaarNavigatie(jaar: number): {
  kan_vorige_jaar: boolean;
  kan_volgende_jaar: boolean;
} {
  const current = currentJaarAmsterdam();
  return {
    kan_vorige_jaar: jaar > 2020,
    kan_volgende_jaar: jaar < current,
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
