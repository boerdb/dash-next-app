/** GET /api/v1/production */
export interface EnphaseApiV1Production {
  wattHoursToday?: number;
  wattHoursSevenDays?: number;
  wattHoursLifetime?: number;
  wattsNow?: number;
}

export interface EnphaseProductionSegment {
  type?: string;
  activeCount?: number;
  readingTime?: number;
  wNow?: number;
  whToday?: number;
  whLifetime?: number;
  whLastSevenDays?: number;
}

/** GET /production.json */
export interface EnphaseProductionJson {
  production?: EnphaseProductionSegment[];
}

export interface EnphaseLive {
  vermogen_w: number | null;
  vandaag_kwh: number | null;
  bereikbaar: boolean;
  melding?: string;
}
