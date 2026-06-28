/** CEST; winter (CET) wordt +01:00 — later via env indien nodig. */
export const NL_TZ_OFFSET = "+02:00";

const NL_TZ = "Europe/Amsterdam";

/** Huidige Amsterdam-tijd als "HH:MM" (24-uurs). */
export function nowAmsterdamHHmm(now: Date = new Date()): string {
  return now.toLocaleTimeString("nl-NL", {
    timeZone: NL_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** server_timestamp uit ingest (Europe/Amsterdam wall clock). */
export function meetMomentFromWeer(data: {
  server_timestamp?: string;
}): string | null {
  const s = data.server_timestamp;
  if (!s) return null;
  return String(s).replace("T", " ").slice(0, 19);
}
