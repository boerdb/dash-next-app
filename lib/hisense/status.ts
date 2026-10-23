import "server-only";
import { env } from "@/lib/env.server";
import { ConnectLifeError, fetchConnectLifeDevices, type ConnectLifeDevice } from "@/lib/hisense/connectlife";
import { fetchOAuthDevices, oauthLinked } from "@/lib/hisense/connectlife-oauth";
import { mapCycle } from "@/lib/hisense/map-status";
import { WD5I1245BBRH, unlinkedStatus } from "@/lib/hisense/profile";
import type { HisenseStatus } from "@/lib/hisense/types";

/** De cloud ververst zelf ook niet sneller; voorkomt een login-storm bij veel tabs. */
const CACHE_MS = 20_000;
const WASHER_TYPE_CODE = "025";

let cached: { at: number; device: ConnectLifeDevice } | null = null;

const passwordConfigured = Boolean(env.CONNECTLIFE_USERNAME && env.CONNECTLIFE_PASSWORD);

/** Browserkoppeling (Apple/Google) gaat voor; anders e-mail + wachtwoord uit env. */
async function connectLifeConfigured(): Promise<boolean> {
  return passwordConfigured || (await oauthLinked());
}

export function resetHisenseCache(): void {
  cached = null;
}

function pickWasher(devices: ConnectLifeDevice[]): ConnectLifeDevice | null {
  if (env.CONNECTLIFE_DEVICE_ID) {
    return devices.find((d) => d.deviceId === env.CONNECTLIFE_DEVICE_ID) ?? null;
  }
  return devices.find((d) => d.deviceTypeCode === WASHER_TYPE_CODE) ?? null;
}

async function loadWasher(force: boolean): Promise<ConnectLifeDevice | null> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.device;
  const devices = (await oauthLinked())
    ? await fetchOAuthDevices()
    : await fetchConnectLifeDevices(env.CONNECTLIFE_USERNAME!, env.CONNECTLIFE_PASSWORD!);
  const device = pickWasher(devices);
  cached = device ? { at: Date.now(), device } : null;
  return device;
}

/** Ruwe statusList, om codes van deze featurecode na te kijken. */
export async function getHisenseRaw(): Promise<ConnectLifeDevice | null> {
  if (!(await connectLifeConfigured())) return null;
  return loadWasher(true);
}

export async function getHisenseStatus(): Promise<HisenseStatus> {
  if (!(await connectLifeConfigured())) return unlinkedStatus();

  let device: ConnectLifeDevice | null;
  try {
    device = await loadWasher(false);
  } catch (err) {
    let message = err instanceof ConnectLifeError ? err.message : "ConnectLife is niet bereikbaar.";
    if (err instanceof ConnectLifeError && err.auth && !(await oauthLinked())) {
      // Apple/Google-accounts hebben geen ConnectLife-wachtwoord.
      message += " Log je in met Apple of Google? Gebruik dan Inloggen bij ConnectLife onder Koppeling.";
    }
    // Laatste bekende stand tonen is beter dan een lege kaart bij een cloud-hik.
    if (cached && !(err instanceof ConnectLifeError && err.auth)) {
      return toStatus(cached.device, `${message} Laatst bekende stand.`, cached.at);
    }
    return unlinkedStatus(message);
  }

  if (!device) {
    return unlinkedStatus(
      env.CONNECTLIFE_DEVICE_ID
        ? `Geen apparaat met deviceId ${env.CONNECTLIFE_DEVICE_ID} op het ConnectLife-account.`
        : "Ingelogd, maar er staat geen wasmachine op het ConnectLife-account. Voeg de machine toe in de ConnectLife-app, of koppel opnieuw.",
    );
  }
  return toStatus(device, null, cached?.at ?? Date.now());
}

function toStatus(device: ConnectLifeDevice, notice: string | null, at: number): HisenseStatus {
  const online = device.offlineState === 1;
  return {
    linked: true,
    appliance: WD5I1245BBRH,
    cycle: mapCycle(device.statusList ?? {}, online),
    notice: notice ?? (online ? null : "De machine is offline in ConnectLife (wifi of stroom uit)."),
    nickname: device.deviceNickName || null,
    featureCode: device.deviceFeatureCode || null,
    updatedAt: new Date(at).toISOString(),
  };
}
