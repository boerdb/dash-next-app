/**
 * Astronomisch getij via Rijkswaterstaat WaterWebservices (ddapi20).
 * @see https://rijkswaterstaatdata.nl/waterdata
 * @see https://waterinfo.rws.nl/publiek/astronomische-getij
 */
import type { GetijItem } from "@/lib/api/types";
import { allowedDayKeys } from "./allowed-days";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "./day-label";
import { rwsPeriodBounds } from "./rws-period";

const RWS_OBSERVATIONS_URL =
  "https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen";

/** Harlingen Waddenzee — officiële RWS-locatiecode. */
export const RWS_HARLINGEN_CODE = "harlingen.waddenzee";

const TIDE_EXTREME_GROUPING = "GETETBRKD2";
const TZ = "Europe/Amsterdam";

interface RwsMeting {
  Meetwaarde?: {
    Waarde_Alfanumeriek?: string;
    Waarde_Numeriek?: number;
  };
  Tijdstip?: string;
}

interface RwsWaarnemingenLijst {
  AquoMetadata?: {
    Grootheid?: { Code?: string };
    Groepering?: { Code?: string };
  };
  MetingenLijst?: RwsMeting[];
}

export interface RwsResponse {
  Succesvol?: boolean;
  WaarnemingenLijst?: RwsWaarnemingenLijst[];
}

function mapExtremeType(label: string): "HW" | "LW" | null {
  const n = label.toLowerCase();
  if (n === "hoogwater") return "HW";
  if (n === "laagwater") return "LW";
  return null;
}

function parseRwsTijdstip(iso: string): Date {
  return new Date(iso);
}

function formatTijd(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function dedupeExtremes(extremes: GetijItem[]): GetijItem[] {
  const seen = new Set<string>();
  return extremes.filter((e) => {
    const key = `${e.dagKey}-${e.type}-${e.tijd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attachPreviousHeight(
  all: GetijItem[],
  visible: GetijItem[]
): GetijItem[] {
  if (visible.length === 0) return visible;
  const out = [...visible];
  const first = out[0]!;
  const prev = [...all].reverse().find((e) => e.at < first.at);
  if (prev) {
    out[0] = { ...first, vorige_hoogte_db: prev.hoogte };
  }
  return out;
}

export function parseRwsTideExtremes(
  data: RwsResponse,
  allowed: Set<string> = allowedDayKeys()
): GetijItem[] {
  if (!data.Succesvol || !data.WaarnemingenLijst?.length) {
    throw new Error("RWS getijden: lege of ongeldige response");
  }

  const lists = data.WaarnemingenLijst;
  const typeList = lists.find((l) =>
    l.MetingenLijst?.some((m) =>
      /^(hoog|laag)water$/i.test(m.Meetwaarde?.Waarde_Alfanumeriek ?? "")
    )
  );
  const heightList = lists.find(
    (l) => l.AquoMetadata?.Grootheid?.Code === "WATHTE"
  );

  const types = typeList?.MetingenLijst ?? [];
  const heights = heightList?.MetingenLijst ?? [];

  const heightByTime = new Map<string, number>();
  for (const m of heights) {
    const t = m.Tijdstip;
    const cm = m.Meetwaarde?.Waarde_Numeriek;
    if (t != null && cm != null) heightByTime.set(t, cm);
  }

  const allExtremes: GetijItem[] = [];

  for (const m of types) {
    const label = m.Meetwaarde?.Waarde_Alfanumeriek;
    const tijdstip = m.Tijdstip;
    if (!label || !tijdstip) continue;

    const type = mapExtremeType(label);
    if (!type) continue;

    const time = parseRwsTijdstip(tijdstip);
    const dagKey = dagKeyAmsterdam(time);
    const cm = heightByTime.get(tijdstip);
    if (cm == null) continue;

    allExtremes.push({
      type,
      tijd: formatTijd(time),
      hoogte: (cm / 100).toFixed(2),
      dagLabel: dagLabelAmsterdam(time),
      dagKey,
      at: time.getTime(),
    });
  }

  const sorted = dedupeExtremes(allExtremes).sort((a, b) => a.at - b.at);
  const visible = sorted.filter((e) => allowed.has(e.dagKey));

  if (visible.length === 0) {
    throw new Error("RWS getijden: geen extremen in periode");
  }

  return attachPreviousHeight(sorted, visible);
}

export async function fetchHarlingenTidesRws(): Promise<GetijItem[]> {
  const { begindatumtijd, einddatumtijd } = rwsPeriodBounds({
    includePriorDay: true,
  });

  const body = {
    Locatie: { Code: RWS_HARLINGEN_CODE },
    AquoPlusWaarnemingMetadata: {
      AquoMetadata: { Groepering: { Code: TIDE_EXTREME_GROUPING } },
    },
    Periode: { Begindatumtijd: begindatumtijd, Einddatumtijd: einddatumtijd },
  };

  const res = await fetch(RWS_OBSERVATIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`RWS getijden: ${res.status}`);
  }

  const data = (await res.json()) as RwsResponse;
  return parseRwsTideExtremes(data);
}
