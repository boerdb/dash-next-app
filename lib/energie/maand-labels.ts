const MONTH_NAMES = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

/** YYYY-MM-DD in Europe/Amsterdam */
export function todayAmsterdamDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function parseJaarMaand(
  jaarRaw: string | null,
  maandRaw: string | null
): { jaar: number; maand: number } | null {
  const now = new Date();
  const jaar =
    jaarRaw != null && jaarRaw !== ""
      ? Number(jaarRaw)
      : Number(
          now.toLocaleString("en-CA", {
            timeZone: "Europe/Amsterdam",
            year: "numeric",
          })
        );
  const maand =
    maandRaw != null && maandRaw !== ""
      ? Number(maandRaw)
      : Number(
          now.toLocaleString("en-CA", {
            timeZone: "Europe/Amsterdam",
            month: "numeric",
          })
        );
  if (!Number.isInteger(jaar) || !Number.isInteger(maand) || maand < 1 || maand > 12) {
    return null;
  }
  return { jaar, maand };
}

/** Eerste dag van de maand (YYYY-MM-DD) en exclusieve bovengrens. */
export function maandDagRange(jaar: number, maand: number): {
  van: string;
  tot: string;
} {
  const van = `${jaar}-${String(maand).padStart(2, "0")}-01`;
  const next = maand === 12 ? { jaar: jaar + 1, maand: 1 } : { jaar, maand: maand + 1 };
  const tot = `${next.jaar}-${String(next.maand).padStart(2, "0")}-01`;
  return { van, tot };
}

export function dagLabelShort(dagIso: string): string {
  const d = new Date(`${dagIso}T12:00:00`);
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "numeric",
  }).formatToParts(d);
  const wd =
    parts.find((p) => p.type === "weekday")?.value.slice(0, 2).toLowerCase() ??
    "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${wd} ${day}`.trim();
}

export function maandTitel(jaar: number, maand: number): string {
  return `${MONTH_NAMES[maand - 1]} ${jaar}`;
}

export function dagTitelLang(dagIso: string): string {
  const [y, m, d] = dagIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function vorigeMaand(jaar: number, maand: number): { jaar: number; maand: number } {
  return maand === 1 ? { jaar: jaar - 1, maand: 12 } : { jaar, maand: maand - 1 };
}

function volgendeMaand(jaar: number, maand: number): { jaar: number; maand: number } {
  return maand === 12 ? { jaar: jaar + 1, maand: 1 } : { jaar, maand: maand + 1 };
}

/** Maand mag maximaal ~2 maanden terug (geen jaaroverzicht). */
export function isMaandToegestaan(jaar: number, maand: number): boolean {
  const today = todayAmsterdamDate();
  const [ty, tm] = today.split("-").map(Number);
  const diffMonths = (ty - jaar) * 12 + (tm - maand);
  return diffMonths >= 0 && diffMonths < 2;
}

export function maandNavigatie(
  jaar: number,
  maand: number,
  vandaag: string
): { kan_vorige_maand: boolean; kan_volgende_maand: boolean } {
  const [ty, tm] = vandaag.split("-").map(Number);
  const prev = vorigeMaand(jaar, maand);
  const next = volgendeMaand(jaar, maand);
  const currentKey = ty * 100 + tm;

  return {
    kan_vorige_maand: isMaandToegestaan(prev.jaar, prev.maand),
    kan_volgende_maand:
      isMaandToegestaan(next.jaar, next.maand) &&
      next.jaar * 100 + next.maand <= currentKey,
  };
}
