import type { WeerLive } from "@/lib/api/types";

/** Parse server_timestamp / dateutc voor vergelijken van live bronnen. */
export function parseLiveTimestamp(
  value: string | number | undefined
): number {
  if (value == null || value === "") return 0;
  const s = String(value);
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

/** Nieuwste tijd uit payload en optioneel DB updated_at. */
export function liveDataTime(
  data: WeerLive,
  dbUpdatedAt?: Date | null
): number {
  const fromPayload = Math.max(
    parseLiveTimestamp(data.server_timestamp),
    parseLiveTimestamp(data.dateutc as string | undefined)
  );
  const fromDb = dbUpdatedAt?.getTime() ?? 0;
  return Math.max(fromPayload, fromDb);
}
