import {
  KNMI_PHENOMENON_LABELS,
  KNMI_WARNING_LEVEL_LABELS,
} from "./constants";

export type KnmiWarningLevel = 0 | 1 | 2 | 3;

export interface KnmiWarningItem {
  level: 1 | 2 | 3;
  levelLabel: string;
  phenomenonId: string;
  phenomenonLabel: string;
  validFrom: string;
  validTo: string;
  texts: string[];
}

export interface KnmiWarningsParsed {
  province: string;
  maxLevel: KnmiWarningLevel;
  maxLevelLabel: string;
  warnings: KnmiWarningItem[];
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagText(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(re);
  return match ? decodeXmlText(match[1]) : null;
}

function extractBlocks(outer: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(outer)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function phenomenonLabel(id: string): string {
  const key = id.trim().toLowerCase();
  return KNMI_PHENOMENON_LABELS[key] ?? id.replace(/_/g, " ");
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

function mergeKey(level: number, phenomenonId: string, texts: string[]): string {
  return `${level}|${phenomenonId}|${texts.join("\n")}`;
}

/**
 * Parseert KNMI waarschuwingen_nederland_48h XML voor één provincie.
 * @see https://dataplatform.knmi.nl/dataset/waarschuwingen-nederland-48h-1-0
 */
export function parseKnmiWarningsXml(
  xml: string,
  province: string
): KnmiWarningsParsed {
  const provinceCode = province.trim().toUpperCase();
  const merged = new Map<
    string,
    KnmiWarningItem & { fromMs: number; toMs: number }
  >();
  let maxLevel: KnmiWarningLevel = 0;

  for (const timeslice of extractBlocks(xml, "timeslice")) {
    const slotTime = tagText(timeslice, "timeslice_id");
    if (!slotTime) continue;
    const slotMs = Date.parse(slotTime);
    const slotLabel = formatSlotTime(slotTime);

    for (const phenomenon of extractBlocks(timeslice, "phenomenon")) {
      const phenomenonId =
        tagText(phenomenon, "phenomenon_id")?.toLowerCase() ?? "onbekend";

      for (const location of extractBlocks(phenomenon, "location")) {
        const locId = tagText(location, "location_id")?.toUpperCase();
        if (locId !== provinceCode) continue;

        const statusRaw = tagText(location, "location_warning_status");
        const level = Number(statusRaw);
        if (!Number.isFinite(level) || level <= 0 || level > 3) continue;

        if (level > maxLevel) maxLevel = level as KnmiWarningLevel;

        const texts = extractBlocks(location, "text_data").map(decodeXmlText).filter(Boolean);
        const uniqueTexts = [...new Set(texts)];
        const key = mergeKey(level, phenomenonId, uniqueTexts);
        const existing = merged.get(key);
        const ms = Number.isNaN(slotMs) ? 0 : slotMs;

        if (!existing) {
          merged.set(key, {
            level: level as 1 | 2 | 3,
            levelLabel: KNMI_WARNING_LEVEL_LABELS[level] ?? `Niveau ${level}`,
            phenomenonId,
            phenomenonLabel: phenomenonLabel(phenomenonId),
            validFrom: slotLabel,
            validTo: slotLabel,
            texts: uniqueTexts,
            fromMs: ms,
            toMs: ms,
          });
          continue;
        }

        if (ms > 0) {
          if (existing.fromMs === 0 || ms < existing.fromMs) {
            existing.fromMs = ms;
            existing.validFrom = slotLabel;
          }
          if (ms > existing.toMs) {
            existing.toMs = ms;
            existing.validTo = slotLabel;
          }
        }
      }
    }
  }

  const warnings = [...merged.values()]
    .sort((a, b) => a.fromMs - b.fromMs)
    .map(({ fromMs: _f, toMs: _t, ...item }) => item);

  return {
    province: provinceCode,
    maxLevel,
    maxLevelLabel: KNMI_WARNING_LEVEL_LABELS[maxLevel],
    warnings,
  };
}
