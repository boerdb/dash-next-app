import { parseLiveTimestamp } from "@/lib/weer/live-data-time";

const TZ = "Europe/Amsterdam";

function amsterdamDateKey(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Label voor laatste weerstation-update (server_timestamp = Amsterdam wall clock). */
export function formatWeerUpdateLabel(
  serverTimestamp?: string
): string | undefined {
  if (!serverTimestamp) return undefined;
  const ms = parseLiveTimestamp(serverTimestamp);
  if (!ms) return undefined;

  const d = new Date(ms);
  const isToday = amsterdamDateKey(ms) === amsterdamDateKey(Date.now());
  const time = d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

  if (isToday) return `Bijgewerkt: ${time}`;

  const dateStr = d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
  return `Bijgewerkt: ${dateStr} ${time}`;
}
