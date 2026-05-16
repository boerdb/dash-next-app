/** Parse Open-Meteo hourly timestamps (local to requested timezone). */
export function parseOpenMeteoLocalTime(
  isoLocal: string,
  utcOffsetSeconds: number
): Date {
  const [datePart, timePart] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm = 0] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - utcOffsetSeconds * 1000);
}
