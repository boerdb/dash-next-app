import "server-only";
import { env } from "@/lib/env.server";
import { ConnectLifeError } from "@/lib/hisense/errors";

/**
 * Vaste app-sleutels van ConnectLife. Ze zijn van Hisense, niet van het account,
 * en staan openbaar in oyvindwe/connectlife; we houden ze toch buiten git.
 * Waarden: zie .env.example.
 */

/** Sleutels voor de browserkoppeling (Hisense' OAuth-client voor Home Assistant). */
export function oauthKeys() {
  const clientId = env.CONNECTLIFE_OAUTH_CLIENT_ID;
  const clientSecret = env.CONNECTLIFE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ConnectLifeError(
      "CONNECTLIFE_OAUTH_CLIENT_ID en CONNECTLIFE_OAUTH_CLIENT_SECRET ontbreken op de server.",
    );
  }
  return { clientId, clientSecret };
}

/** Sleutels voor de wachtwoordkoppeling (zoals de ConnectLife-app). */
export function passwordKeys() {
  const k = {
    gigyaApiKey: env.CONNECTLIFE_GIGYA_API_KEY,
    clientId: env.CONNECTLIFE_APP_CLIENT_ID,
    clientSecret: env.CONNECTLIFE_APP_CLIENT_SECRET,
    gatewayAppId: env.CONNECTLIFE_GATEWAY_APP_ID,
    gatewayAppSecret: env.CONNECTLIFE_GATEWAY_APP_SECRET,
    gatewaySignSuffix: env.CONNECTLIFE_GATEWAY_SIGN_SUFFIX,
    gatewayPublicKey: env.CONNECTLIFE_GATEWAY_PUBLIC_KEY,
  };
  const missing = Object.entries(k)
    .filter(([, v]) => !v)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new ConnectLifeError(`ConnectLife-appsleutels ontbreken op de server: ${missing.join(", ")}.`);
  }
  const body = k.gatewayPublicKey!.replace(/-----[^-]+-----|\s/g, "");
  return {
    ...(k as { [K in keyof typeof k]: string }),
    // In env als één regel base64; Node wil PEM met regels van 64 tekens.
    gatewayPublicKey: `-----BEGIN PUBLIC KEY-----\n${body.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`,
  };
}
