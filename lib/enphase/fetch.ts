import "server-only";

import { fetchEnphaseGatewayToken } from "./auth";
import { fetchEnphaseJson } from "./http";
import { mapEnphaseProduction, toEnphaseLive } from "./map";
import type {
  EnphaseApiV1Production,
  EnphaseLive,
  EnphaseProductionJson,
} from "./types";

export interface EnphaseFetchConfig {
  gatewayUrl: string;
  serial: string;
  token?: string;
  enlightenEmail?: string;
  enlightenPassword?: string;
  whLifetimeStart?: number | null;
}

let cachedToken: string | null = null;
let cachedTokenForSerial: string | null = null;

async function resolveToken(config: EnphaseFetchConfig): Promise<string | null> {
  if (config.token?.trim()) return config.token.trim();

  if (
    cachedToken &&
    cachedTokenForSerial === config.serial &&
    config.enlightenEmail &&
    config.enlightenPassword
  ) {
    return cachedToken;
  }

  if (!config.enlightenEmail || !config.enlightenPassword) return null;

  const token = await fetchEnphaseGatewayToken({
    email: config.enlightenEmail,
    password: config.enlightenPassword,
    serial: config.serial,
  });
  if (token) {
    cachedToken = token;
    cachedTokenForSerial = config.serial;
  }
  return token;
}

function gatewayBase(url: string): string {
  const u = new URL(url.includes("://") ? url : `https://${url}`);
  return `${u.protocol}//${u.host}`;
}

export interface EnphaseFetchResult {
  live: EnphaseLive;
  wh_lifetime: number | null;
}

export async function fetchEnphaseLive(
  config: EnphaseFetchConfig
): Promise<EnphaseFetchResult> {
  if (!config.gatewayUrl?.trim() || !config.serial?.trim()) {
    return {
      live: {
        vermogen_w: null,
        vandaag_kwh: null,
        bereikbaar: false,
        melding: "Enphase niet geconfigureerd",
      },
      wh_lifetime: null,
    };
  }

  const token = await resolveToken(config);
  if (!token) {
    return {
      live: {
        vermogen_w: null,
        vandaag_kwh: null,
        bereikbaar: false,
        melding:
          "Enphase-token ontbreekt (ENPHASE_GATEWAY_TOKEN of Enlighten-login)",
      },
      wh_lifetime: null,
    };
  }

  const base = gatewayBase(config.gatewayUrl);
  const [v1, legacy] = await Promise.all([
    fetchEnphaseJson<EnphaseApiV1Production>(
      `${base}/api/v1/production`,
      token
    ),
    fetchEnphaseJson<EnphaseProductionJson>(`${base}/production.json`, token),
  ]);

  if (!v1 && !legacy) {
    return {
      live: {
        vermogen_w: null,
        vandaag_kwh: null,
        bereikbaar: false,
        melding: "Enphase gateway niet bereikbaar of token verlopen",
      },
      wh_lifetime: null,
    };
  }

  const mapped = mapEnphaseProduction(
    v1,
    legacy,
    config.whLifetimeStart ?? null
  );
  return { live: toEnphaseLive(mapped), wh_lifetime: mapped.wh_lifetime };
}

/** whLifetime voor dagstart bij unmetered gateways zonder whToday. */
export function enphaseWhLifetimeFromRaw(
  v1: EnphaseApiV1Production | null,
  legacy: EnphaseProductionJson | null
): number | null {
  const mapped = mapEnphaseProduction(v1, legacy, null);
  return mapped.wh_lifetime;
}
