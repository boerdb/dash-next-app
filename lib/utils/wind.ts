const DIRS = [
  "N",
  "NNO",
  "NO",
  "ONO",
  "O",
  "OZO",
  "ZO",
  "ZZO",
  "Z",
  "ZZW",
  "ZW",
  "WZW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export function getWindDirection(degrees: number | undefined): string {
  if (degrees === undefined || Number.isNaN(degrees)) return "--";
  return DIRS[Math.floor(degrees / 22.5 + 0.5) % 16];
}

/** Graden voor label + pijl (Ecowitt winddir = waar wind vandaan komt). */
export function resolveWindDegrees(data: {
  winddir?: number;
  winddir_avg10m?: number | string;
}): number {
  const avg = data.winddir_avg10m;
  if (avg !== undefined && avg !== "" && !Number.isNaN(Number(avg))) {
    return Number(avg);
  }
  return data.winddir ?? 0;
}

/**
 * CSS-rotatie voor pijl: wijst waar wind vandaan komt (zelfde als tekst ZW/NO).
 * Ecowitt graden = meteorologisch FROM; pijl was 180° gedraaid (waait-heen i.p.v. komt-vandaan).
 */
export function windArrowRotation(fromDegrees: number): number {
  return ((fromDegrees % 360) + 360) % 360;
}
