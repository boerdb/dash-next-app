/** CEST; winter (CET) wordt +01:00 — later via env indien nodig. */
export const NL_TZ_OFFSET = "+02:00";

/** server_timestamp uit ingest (Europe/Amsterdam wall clock). */
export function meetMomentFromWeer(data: {
  server_timestamp?: string;
}): string | null {
  const s = data.server_timestamp;
  if (!s) return null;
  return String(s).replace("T", " ").slice(0, 19);
}
