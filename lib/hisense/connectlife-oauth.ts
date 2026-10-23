import "server-only";
import crypto from "node:crypto";
import { type ConnectLifeDevice } from "@/lib/hisense/connectlife";
import { ConnectLifeError } from "@/lib/hisense/errors";
import { oauthKeys } from "@/lib/hisense/keys";
import { readJson, writeJson } from "@/lib/tahoma/storage";

/**
 * Inloggen via de ConnectLife-loginpagina (ook met Apple/Google), voor accounts
 * zonder eigen wachtwoord.
 *
 * Gebruikt Hisense' OAuth-client voor Home Assistant (sleutels in env), zoals in
 * oyvindwe/connectlife (connectlife/oauth.py). Die client accepteert alleen de
 * My Home Assistant-redirect; daar lezen we de code uit de geplakte adresbalk.
 * Verzoeken gaan naar de third-party API (juapi-3rd) met HMAC-headers.
 */

const AUTHORIZE_URL = "https://oauth.hijuconn.com/login";
const TOKEN_URL = "https://oauth.hijuconn.com/oauth/token";
export const OAUTH_REDIRECT_URI = "https://my.home-assistant.io/redirect/oauth";

const DEVICE_LIST_URL = "https://juapi-3rd.hijuconn.com/clife-svc/pu/get_device_status_list";
/** SHA-256 (base64) van een lege body. */
const EMPTY_BODY_DIGEST = "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=";
const INVALID_ACCESS_TOKEN = 100026;

const TOKEN_FILE = "connectlife-token.json";
/** Een gestarte koppeling blijft 30 minuten geldig. */
const PENDING_MS = 30 * 60_000;
const TIMEOUT_MS = 20_000;

interface OAuthState {
  accessToken: string | null;
  /** ms epoch; 90 s vóór werkelijke verloop. */
  expiresAt: number;
  refreshToken: string | null;
  /** Vaste client-id richting de API; een nieuwe kan een nieuwe client registreren. */
  sourceId: string;
  linkedAt: string | null;
  pendingState: string | null;
  pendingSince: number | null;
}

function newSourceId(): string {
  const digest = crypto
    .createHash("md5")
    .update(`${crypto.randomUUID()}${Date.now()}`)
    .digest("hex");
  return `td001002000${digest}`;
}

async function load(): Promise<OAuthState> {
  const stored = await readJson<Partial<OAuthState> | null>(TOKEN_FILE, null);
  return {
    accessToken: stored?.accessToken ?? null,
    expiresAt: stored?.expiresAt ?? 0,
    refreshToken: stored?.refreshToken ?? null,
    sourceId: stored?.sourceId || newSourceId(),
    linkedAt: stored?.linkedAt ?? null,
    pendingState: stored?.pendingState ?? null,
    pendingSince: stored?.pendingSince ?? null,
  };
}

let state: OAuthState | null = null;

async function current(): Promise<OAuthState> {
  state ??= await load();
  return state;
}

async function save(next: OAuthState): Promise<void> {
  state = next;
  await writeJson(TOKEN_FILE, next);
}

export async function oauthLinked(): Promise<boolean> {
  return Boolean((await current()).refreshToken);
}

/** Loopt er een gestarte koppeling die nog op de geplakte link wacht? */
export async function oauthPending(): Promise<boolean> {
  const s = await current();
  return Boolean(s.pendingState && s.pendingSince && Date.now() - s.pendingSince < PENDING_MS);
}

/** Start een koppeling: geeft de loginpagina terug met een nieuwe state. */
export async function startOAuthLink(): Promise<string> {
  const s = await current();
  const pendingState = crypto.randomBytes(16).toString("hex");
  await save({ ...s, pendingState, pendingSince: Date.now() });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: oauthKeys().clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    state: pendingState,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: oauthKeys().clientId,
      client_secret: oauthKeys().clientSecret,
      redirect_uri: OAUTH_REDIRECT_URI,
      ...body,
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // val door naar de foutmelding hieronder
  }
  if (!res.ok || typeof json.access_token !== "string") {
    const reason = (json.error_description ?? json.error ?? json.msg ?? `HTTP ${res.status}`) as string;
    throw new ConnectLifeError(`ConnectLife token geweigerd: ${reason}`, true);
  }
  return json;
}

function withToken(s: OAuthState, body: Record<string, unknown>): OAuthState {
  const expiresIn = Number(body.expires_in ?? 3600);
  return {
    ...s,
    accessToken: body.access_token as string,
    expiresAt: Date.now() + (expiresIn - 90) * 1000,
    refreshToken: (body.refresh_token as string | undefined) ?? s.refreshToken,
  };
}

/**
 * Rond de koppeling af met de geplakte adresbalk (of alleen de code).
 * State moet overeenkomen met de laatst gestarte koppeling.
 */
export async function finishOAuthLink(pasted: string): Promise<void> {
  const s = await current();
  const text = pasted.trim();
  let code: string | null = null;
  let returnedState: string | null = null;
  try {
    const url = new URL(text);
    code = url.searchParams.get("code");
    returnedState = url.searchParams.get("state");
  } catch {
    code = /^[\w.~-]+$/.test(text) ? text : null;
  }
  if (!code) throw new ConnectLifeError("Geen code gevonden in de geplakte link.");
  if (!s.pendingState || !s.pendingSince || Date.now() - s.pendingSince > PENDING_MS) {
    throw new ConnectLifeError("Koppeling verlopen. Klik opnieuw op Inloggen bij ConnectLife.");
  }
  if (returnedState && returnedState !== s.pendingState) {
    throw new ConnectLifeError("Deze link hoort bij een oudere koppelpoging. Begin opnieuw.");
  }

  const body = await tokenRequest({ grant_type: "authorization_code", code });
  await save({
    ...withToken(s, body),
    linkedAt: new Date().toISOString(),
    pendingState: null,
    pendingSince: null,
  });
}

export async function unlinkOAuth(): Promise<void> {
  const s = await current();
  await save({
    ...s,
    accessToken: null,
    expiresAt: 0,
    refreshToken: null,
    linkedAt: null,
    pendingState: null,
    pendingSince: null,
  });
}

async function accessToken(force = false): Promise<string> {
  const s = await current();
  if (!force && s.accessToken && s.expiresAt > Date.now()) return s.accessToken;
  if (!s.refreshToken) throw new ConnectLifeError("Niet gekoppeld met ConnectLife.", true);
  const body = await tokenRequest({ grant_type: "refresh_token", refresh_token: s.refreshToken });
  const next = withToken(s, body);
  await save(next);
  return next.accessToken!;
}

function systemParams(sourceId: string): Record<string, string> {
  const timeStamp = String(Date.now());
  return {
    timeStamp,
    version: "8.1",
    languageId: "1",
    timezone: "UTC",
    randStr: crypto.createHash("md5").update(`${crypto.randomUUID()}${timeStamp}`).digest("hex"),
    appId: oauthKeys().clientId,
    sourceId,
    platformId: "5",
  };
}

/** HMAC-SHA256 over request-target, datum en hi-params-encrypt (Hisense HA-plugin). */
export function signingHeaders(method: string, url: string, date: Date = new Date()): Record<string, string> {
  const { clientId, clientSecret } = oauthKeys();
  const gmt = date.toUTCString();
  const path = url.replace(/^https?:\/\/[^/]*/, "");
  const signingString =
    `${clientId}\n${method} ${path}\ndate: ${gmt}\n` + `hi-params-encrypt: ${clientId}\n`;
  const signature = crypto.createHmac("sha256", clientSecret).update(signingString).digest("base64");
  return {
    "hi-params-encrypt": clientId,
    Date: gmt,
    Authorization:
      `Signature signature="${signature}", keyId="${clientId}",` +
      `algorithm="hmac-sha256", headers="@request-target date hi-params-encrypt"`,
    Digest: `SHA-256=${EMPTY_BODY_DIGEST}`,
  };
}

async function requestDevices(token: string, sourceId: string): Promise<Record<string, unknown>> {
  const query = Object.entries(systemParams(sourceId))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const url = `${DEVICE_LIST_URL}?${query}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "connectlife-oauth",
      "Content-Type": "application/json",
      accessToken: token,
      ...signingHeaders("GET", url),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new ConnectLifeError(`ConnectLife API: HTTP ${res.status}`);
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new ConnectLifeError("ConnectLife API: geen JSON");
  }
}

/** Apparaten op het gekoppelde account, met statusList. */
export async function fetchOAuthDevices(): Promise<ConnectLifeDevice[]> {
  const { sourceId } = await current();
  let body = await requestDevices(await accessToken(), sourceId);
  if (Number(body.errorCode ?? body.resultCode) === INVALID_ACCESS_TOKEN) {
    body = await requestDevices(await accessToken(true), sourceId);
  }
  const resultCode = body.resultCode;
  if (resultCode != null && Number(resultCode) !== 0) {
    const code = Number(body.errorCode ?? resultCode);
    throw new ConnectLifeError(
      `ConnectLife API: ${String(body.errorDesc ?? body.msg ?? "fout")} (${code})`,
      code === INVALID_ACCESS_TOKEN,
    );
  }
  if (!Array.isArray(body.deviceList)) throw new ConnectLifeError("ConnectLife: apparatenlijst ontbreekt");
  return body.deviceList as ConnectLifeDevice[];
}
