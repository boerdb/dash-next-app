const NL_TZ = "Europe/Amsterdam";

function formatAmsterdam(isoUtc: Date): string {
  return isoUtc
    .toLocaleString("sv-SE", { timeZone: NL_TZ })
    .replace("T", " ")
    .slice(0, 19);
}

/** Ecowitt dateutc → UTC-middernacht van die meetdag. */
function utcMidnightFromDateUtc(dateutc: string | undefined): Date | null {
  if (!dateutc?.trim()) return null;
  const normalized = dateutc.trim().replace(" ", "T");
  const measured = new Date(
    normalized.endsWith("Z") ? normalized : `${normalized}Z`
  );
  if (Number.isNaN(measured.getTime())) return null;
  return new Date(
    Date.UTC(
      measured.getUTCFullYear(),
      measured.getUTCMonth(),
      measured.getUTCDate()
    )
  );
}

/**
 * Ecowitt lightning_time: ms sinds UTC-middernacht op de meetdag (WH57 / gateway).
 * Grote waarden (>1e9) worden als Unix-timestamp (s of ms) gelezen.
 */
export function parseLightningTime(
  raw: string | number | undefined,
  dateutc?: string
): { isoAmsterdam: string; raw: number } | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  let strikeUtc: Date;
  if (n >= 1e12) {
    strikeUtc = new Date(n);
  } else if (n >= 1e9) {
    strikeUtc = new Date(n * 1000);
  } else {
    const midnight = utcMidnightFromDateUtc(dateutc);
    if (!midnight) return null;
    strikeUtc = new Date(midnight.getTime() + n);
  }

  if (Number.isNaN(strikeUtc.getTime())) return null;
  return { isoAmsterdam: formatAmsterdam(strikeUtc), raw: n };
}

/** Recente inslag (standaard 45 min) voor onweer-weergave. */
export function isRecentLightningStrike(
  lightningTimeAmsterdam: string | undefined,
  maxAgeMs = 45 * 60 * 1000,
  now = Date.now()
): boolean {
  if (!lightningTimeAmsterdam) return false;
  const strike = new Date(lightningTimeAmsterdam.replace(" ", "T"));
  if (Number.isNaN(strike.getTime())) return false;
  return now - strike.getTime() >= 0 && now - strike.getTime() < maxAgeMs;
}
