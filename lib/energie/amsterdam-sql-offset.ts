/** MySQL CONVERT_TZ offset voor Europe/Amsterdam (DST-proof). */
export function amsterdamSqlOffset(date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;

  const m = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!m) {
    return "+01:00";
  }
  const hh = m[2].padStart(2, "0");
  const mm = (m[3] ?? "00").padStart(2, "0");
  return `${m[1]}${hh}:${mm}`;
}
