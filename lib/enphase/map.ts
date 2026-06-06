import type {
  EnphaseApiV1Production,
  EnphaseLive,
  EnphaseProductionJson,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function whToKwh(wh: number): number {
  return round2(wh / 1000);
}

function invertersSegment(
  raw: EnphaseProductionJson | null
): EnphaseProductionJson["production"] extends (infer T)[] | undefined
  ? T | undefined
  : undefined {
  return raw?.production?.find((s) => s.type === "inverters");
}

export function mapEnphaseProduction(
  v1: EnphaseApiV1Production | null,
  legacy: EnphaseProductionJson | null,
  whLifetimeStart: number | null
): {
  vermogen_w: number | null;
  vandaag_kwh: number | null;
  wh_lifetime: number | null;
} {
  const inv = invertersSegment(legacy);

  let vermogen_w: number | null = null;
  if (v1?.wattsNow != null && !Number.isNaN(Number(v1.wattsNow))) {
    vermogen_w = Math.round(Number(v1.wattsNow));
  } else if (inv?.wNow != null && !Number.isNaN(Number(inv.wNow))) {
    vermogen_w = Math.round(Number(inv.wNow));
  }

  const wh_lifetime =
    v1?.wattHoursLifetime != null
      ? Number(v1.wattHoursLifetime)
      : inv?.whLifetime != null
        ? Number(inv.whLifetime)
        : null;

  let vandaag_kwh: number | null = null;
  // Amsterdam-dag via whLifetime-delta (gateway whToday reset op UTC-middernacht).
  if (
    wh_lifetime != null &&
    whLifetimeStart != null &&
    wh_lifetime >= whLifetimeStart
  ) {
    vandaag_kwh = whToKwh(wh_lifetime - whLifetimeStart);
  } else if (
    v1?.wattHoursToday != null &&
    !Number.isNaN(Number(v1.wattHoursToday))
  ) {
    vandaag_kwh = whToKwh(Number(v1.wattHoursToday));
  } else if (inv?.whToday != null && !Number.isNaN(Number(inv.whToday))) {
    vandaag_kwh = whToKwh(Number(inv.whToday));
  }

  return { vermogen_w, vandaag_kwh, wh_lifetime };
}

export function toEnphaseLive(
  mapped: ReturnType<typeof mapEnphaseProduction>,
  melding?: string
): EnphaseLive {
  const hasData =
    mapped.vermogen_w != null ||
    mapped.vandaag_kwh != null ||
    mapped.wh_lifetime != null;
  return {
    vermogen_w: mapped.vermogen_w,
    vandaag_kwh:
      mapped.vandaag_kwh != null ? round1(mapped.vandaag_kwh) : null,
    bereikbaar: hasData,
    melding,
  };
}
