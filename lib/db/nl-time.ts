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

/** Parse "YYYY-MM-DD HH:mm:ss" als Europe/Amsterdam wall clock → epoch ms. */
export function parseAmsterdamDateTime(isoLocal: string): number | null {
  const m = isoLocal
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  const ss = Number(m[6] ?? 0);
  if ([y, mo, d, hh, mi, ss].some((n) => !Number.isFinite(n))) return null;

  const expected = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  for (const offset of ["+02:00", "+01:00"] as const) {
    const candidate = Date.parse(
      `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${String(ss).padStart(2, "0")}${offset}`
    );
    if (Number.isNaN(candidate)) continue;
    const back = new Date(candidate)
      .toLocaleString("sv-SE", { timeZone: NL_TZ, hour12: false })
      .replace("T", " ")
      .slice(0, 19);
    if (back === expected) return candidate;
  }
  return null;
}

/** server_timestamp uit ingest (Europe/Amsterdam wall clock). */
export function meetMomentFromWeer(data: {
  server_timestamp?: string;
}): string | null {
  const s = data.server_timestamp;
  if (!s) return null;
  return String(s).replace("T", " ").slice(0, 19);
}
