import {
  KNMI_COLOR_TO_LEVEL,
  KNMI_PHENOMENON_LABELS,
  KNMI_WARNING_LEVEL_LABELS,
  KNMI_WARNING_LOCATION,
} from "./constants";
import { pointInGeoJsonArea } from "./geo";

export type KnmiWarningLevel = 0 | 1 | 2 | 3;
export type KnmiWarningType = "warning" | "potentially-dangerous-weather";

export interface KnmiWarningItem {
  level: 1 | 2 | 3;
  levelLabel: string;
  phenomenonId: string;
  phenomenonLabel: string;
  validFrom: string;
  validTo: string;
  /** Geldt de waarschuwing nu (±tolerantie rond het tijdvak)? */
  active: boolean;
  texts: string[];
  areaLabel: string;
  warningType: KnmiWarningType;
}

/** Tolerantie rond het waarschuwingstijdvak om "nu actief" te bepalen. */
const KNMI_ACTIVE_TOLERANCE_MS = 3 * 60 * 60 * 1000;

export interface KnmiPublicWarningsParsed {
  locationLabel: string;
  maxLevel: KnmiWarningLevel;
  maxLevelLabel: string;
  warnings: KnmiWarningItem[];
  publicationType: string | null;
  isTestPublication: boolean;
}

interface LocalizedTexts {
  headline?: string | null;
  description?: string | null;
  detailed_description?: string | null;
}

interface WarningPart {
  part_uuid?: string;
  color?: string;
  severity?: string;
  area?: { type?: string; coordinates?: unknown };
  area_description?: { nl?: string | null; en?: string | null };
  guidance?: {
    nl?: { impact?: string | null; instruction?: string | null } | null;
  };
  onset?: string;
  expires?: string;
  status?: string;
}

interface WarningSet {
  phenomenon?: string;
  onset?: string;
  expires?: string;
  texts?: { nl?: LocalizedTexts | null };
  warning_type?: string;
  status?: string;
  operational_status?: string;
  parts?: WarningPart[];
  incident?: { name?: string | null; incident_name?: string | null };
}

export interface KnmiPublicWarningsSnapshot {
  metadata?: {
    publication_type?: string | null;
    generated_at?: string;
  };
  warnings?: WarningSet[];
}

function phenomenonLabel(id: string): string {
  const key = id.trim().toLowerCase();
  return KNMI_PHENOMENON_LABELS[key] ?? id.replace(/-/g, " ");
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isTestPublicationType(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "test";
}

function isActualOperationalStatus(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "actual";
}

function isDisplayableLifecycle(status: string | null | undefined): boolean {
  const s = (status ?? "active").trim().toLowerCase();
  return s === "active";
}

function levelFromColor(color: string | null | undefined): 1 | 2 | 3 | null {
  if (!color) return null;
  return KNMI_COLOR_TO_LEVEL[color.trim().toLowerCase()] ?? null;
}

function collectTexts(
  set: WarningSet,
  part: WarningPart
): string[] {
  const nl = set.texts?.nl;
  const guidance = part.guidance?.nl;
  const incidentName = set.incident?.name ?? set.incident?.incident_name;
  const out: string[] = [];

  if (nl?.headline) out.push(nl.headline);
  if (nl?.description) out.push(nl.description);
  if (nl?.detailed_description) out.push(nl.detailed_description);
  if (guidance?.impact) out.push(guidance.impact);
  if (guidance?.instruction) out.push(guidance.instruction);
  if (incidentName) out.push(incidentName);

  return [...new Set(out.map((t) => t.trim()).filter(Boolean))];
}

/**
 * Parseert KNMI-public-weather-warnings JSON voor één lat/lon (polygon-filter).
 * Toont alleen operational_status Actual en lifecycle status active.
 * @see https://dataplatform.knmi.nl/dataset/docs/knmi-public-weather-warnings-1-0
 */
export function parseKnmiPublicWarningsJson(
  snapshot: KnmiPublicWarningsSnapshot,
  opts: {
    latitude?: number;
    longitude?: number;
    locationLabel?: string;
    now?: number;
  } = {}
): KnmiPublicWarningsParsed {
  const latitude = opts.latitude ?? KNMI_WARNING_LOCATION.latitude;
  const longitude = opts.longitude ?? KNMI_WARNING_LOCATION.longitude;
  const locationLabel = opts.locationLabel ?? KNMI_WARNING_LOCATION.label;
  const now = opts.now ?? Date.now();
  const publicationType = snapshot.metadata?.publication_type ?? null;
  const testPublication = isTestPublicationType(publicationType);

  const warnings: KnmiWarningItem[] = [];
  let maxLevel: KnmiWarningLevel = 0;

  if (testPublication) {
    return {
      locationLabel,
      maxLevel: 0,
      maxLevelLabel: KNMI_WARNING_LEVEL_LABELS[0],
      warnings: [],
      publicationType,
      isTestPublication: true,
    };
  }

  for (const set of snapshot.warnings ?? []) {
    if (!isActualOperationalStatus(set.operational_status)) continue;
    if (!isDisplayableLifecycle(set.status)) continue;

    const phenomenonId = (set.phenomenon ?? "onbekend").trim().toLowerCase();
    const warningType: KnmiWarningType =
      set.warning_type === "potentially-dangerous-weather"
        ? "potentially-dangerous-weather"
        : "warning";

    for (const part of set.parts ?? []) {
      if (!isDisplayableLifecycle(part.status)) continue;
      if (!pointInGeoJsonArea(longitude, latitude, part.area)) continue;

      const level = levelFromColor(part.color);
      if (!level) continue;

      const onset = part.onset ?? set.onset;
      const expires = part.expires ?? set.expires;
      if (!onset || !expires) continue;

      const fromMs = Date.parse(onset);
      const toMs = Date.parse(expires);
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) continue;

      // Toekomstige delen tonen; volledig verlopen delen overslaan.
      if (now > toMs + KNMI_ACTIVE_TOLERANCE_MS) continue;

      if (level > maxLevel) maxLevel = level;

      const areaLabel =
        part.area_description?.nl?.trim() || locationLabel;

      warnings.push({
        level,
        levelLabel: KNMI_WARNING_LEVEL_LABELS[level] ?? `Niveau ${level}`,
        phenomenonId,
        phenomenonLabel: phenomenonLabel(phenomenonId),
        validFrom: formatSlotTime(onset),
        validTo: formatSlotTime(expires),
        active:
          now >= fromMs - KNMI_ACTIVE_TOLERANCE_MS &&
          now <= toMs + KNMI_ACTIVE_TOLERANCE_MS,
        texts: collectTexts(set, part),
        areaLabel,
        warningType,
      });
    }
  }

  warnings.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return a.validFrom.localeCompare(b.validFrom, "nl");
  });

  return {
    locationLabel,
    maxLevel,
    maxLevelLabel: KNMI_WARNING_LEVEL_LABELS[maxLevel],
    warnings,
    publicationType,
    isTestPublication: false,
  };
}
