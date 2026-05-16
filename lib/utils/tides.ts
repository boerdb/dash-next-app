import type { GetijItem } from "@/lib/api/types";

export function berekenVerschil(index: number, getijden: GetijItem[]): string {
  const huidige = getijden[index];
  let vorigeHoogte: number | null = null;

  if (index === 0) {
    vorigeHoogte = huidige.vorige_hoogte_db
      ? parseFloat(huidige.vorige_hoogte_db)
      : null;
  } else {
    vorigeHoogte = parseFloat(getijden[index - 1].hoogte);
  }

  if (vorigeHoogte === null || Number.isNaN(vorigeHoogte)) return "---";

  const huidigeHoogte = parseFloat(huidige.hoogte);
  const verschil = (huidigeHoogte - vorigeHoogte).toFixed(2);
  const symbool = huidigeHoogte > vorigeHoogte ? "↑" : "↓";

  return `${symbool} ${Math.abs(parseFloat(verschil))} m`;
}

export function getActiveTideIndex(getijden: GetijItem[]): number {
  if (!getijden.length) return -1;

  const now = Date.now();
  for (let i = 0; i < getijden.length; i++) {
    if (getijden[i].at > now) return i;
  }

  return getijden.length - 1;
}

export function getLiveStatus(getijden: GetijItem[]) {
  const now = Date.now();
  let laatsteGetij: GetijItem | null = null;

  for (const g of getijden) {
    if (now < g.at) {
      return {
        tekst: g.type === "HW" ? "Water stijgt" : "Water daalt",
        icoon: g.type === "HW" ? ("up" as const) : ("down" as const),
        kleur: g.type === "HW" ? ("success" as const) : ("danger" as const),
      };
    }
    laatsteGetij = g;
  }

  if (laatsteGetij) {
    return {
      tekst:
        laatsteGetij.type === "LW" ? "Water stijgt" : "Water daalt",
      icoon: laatsteGetij.type === "LW" ? ("up" as const) : ("down" as const),
      kleur: laatsteGetij.type === "LW" ? ("success" as const) : ("danger" as const),
    };
  }

  return {
    tekst: "Geen data",
    icoon: "help" as const,
    kleur: "muted" as const,
  };
}
