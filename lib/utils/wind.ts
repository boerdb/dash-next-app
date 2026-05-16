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
