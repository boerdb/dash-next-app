import "server-only";
import crypto from "node:crypto";
import { ConnectLifeError } from "@/lib/hisense/errors";
import { passwordKeys } from "@/lib/hisense/keys";

/**
 * ConnectLife-cloud (Hisense). De machine heeft geen LAN-API; status loopt via
 * Gigya-login → HijuConn OAuth → HijuConn-gateway (ondertekende verzoeken).
 *
 * Flow volgt de open-source client van oyvindwe/connectlife
 * (connectlife/api.py), die ook de Home Assistant-integratie voedt.
 * De app-sleutels komen uit env (lib/hisense/keys.ts).
 */

const GIGYA_LOGIN_URL = "https://accounts.eu1.gigya.com/accounts.login";
const GIGYA_JWT_URL = "https://accounts.eu1.gigya.com/accounts.getJWT";

const OAUTH_AUTHORIZE_URL = "https://oauth.hijuconn.com/oauth/authorize";
const OAUTH_TOKEN_URL = "https://oauth.hijuconn.com/oauth/token";
const OAUTH_REDIRECT_URI = "https://api.connectlife.io/swagger/oauth2-redirect.html";

const GATEWAY_DEVICE_LIST_URL =
  "https://clife-eu-gateway.hijuconn.com/clife-svc/pu/get_device_status_list";
const GATEWAY_INVALID_ACCESS_TOKEN = 100026;
const GATEWAY_RANDSTR_CHECK_FAILED = 101005;

const TIMEOUT_MS = 20_000;

export { ConnectLifeError };

/** Eén apparaat uit get_device_status_list. Alleen de velden die we gebruiken. */
export interface ConnectLifeDevice {
  deviceId: string;
  puid: string;
  deviceNickName: string | null;
  deviceTypeCode: string;
  deviceFeatureCode: string;
  deviceFeatureName: string | null;
  /** 1 = online. */
  offlineState: number;
  statusList: Record<string, string>;
}

interface TokenState {
  accessToken: string;
  /** ms epoch; 90 s vóór werkelijke verloop. */
  expiresAt: number;
  refreshToken: string | null;
}

/** Proces-cache: één login per server, niet per verzoek. */
let token: TokenState | null = null;
let tokenKey: string | null = null;

async function readJson(res: Response, step: string, auth: boolean): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!res.ok) {
    throw new ConnectLifeError(`ConnectLife ${step}: HTTP ${res.status}`, auth);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ConnectLifeError(`ConnectLife ${step}: geen JSON`, auth);
  }
}

function requireField<T>(body: Record<string, unknown>, field: string, step: string): T {
  if (!(field in body)) {
    throw new ConnectLifeError(`ConnectLife ${step}: '${field}' ontbreekt`, true);
  }
  return body[field] as T;
}

function post(url: string, body: URLSearchParams | object): Promise<Response> {
  const form = body instanceof URLSearchParams;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
    body: form ? body.toString() : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function setToken(body: Record<string, unknown>): void {
  const accessToken = requireField<string>(body, "access_token", "token");
  const expiresIn = Number(requireField(body, "expires_in", "token"));
  token = {
    accessToken,
    expiresAt: Date.now() + (expiresIn - 90) * 1000,
    refreshToken: (body.refresh_token as string | undefined) ?? token?.refreshToken ?? null,
  };
}

async function login(username: string, password: string): Promise<void> {
  const loginBody = await readJson(
    await post(
      GIGYA_LOGIN_URL,
      new URLSearchParams({ loginID: username, password, APIKey: passwordKeys().gigyaApiKey }),
    ),
    "login",
    true,
  );
  if (loginBody.errorCode || loginBody.errorMessage) {
    // 206001: voorwaarden opnieuw accepteren in de ConnectLife-app.
    const hint = loginBody.errorCode === 206001 ? " (accepteer de voorwaarden in de ConnectLife-app)" : "";
    throw new ConnectLifeError(
      `ConnectLife login mislukt: ${String(loginBody.errorMessage ?? loginBody.errorCode)}${hint}`,
      true,
    );
  }
  const uid = requireField<string>(loginBody, "UID", "login");
  const session = requireField<{ cookieValue?: string }>(loginBody, "sessionInfo", "login");
  if (!session.cookieValue) {
    throw new ConnectLifeError("ConnectLife login: sessie ontbreekt", true);
  }

  const jwtBody = await readJson(
    await post(
      GIGYA_JWT_URL,
      new URLSearchParams({ APIKey: passwordKeys().gigyaApiKey, login_token: session.cookieValue }),
    ),
    "getJWT",
    true,
  );
  const idToken = requireField<string>(jwtBody, "id_token", "getJWT");

  const authBody = await readJson(
    await post(OAUTH_AUTHORIZE_URL, {
      client_id: passwordKeys().clientId,
      redirect_uri: OAUTH_REDIRECT_URI,
      idToken,
      response_type: "code",
      thirdType: "CDC",
      thirdClientId: uid,
    }),
    "authorize",
    true,
  );
  const code = requireField<string>(authBody, "code", "authorize");

  setToken(
    await readJson(
      await post(
        OAUTH_TOKEN_URL,
        new URLSearchParams({
          client_id: passwordKeys().clientId,
          client_secret: passwordKeys().clientSecret,
          redirect_uri: OAUTH_REDIRECT_URI,
          grant_type: "authorization_code",
          code,
        }),
      ),
      "token",
      true,
    ),
  );
}

async function refresh(): Promise<void> {
  if (!token?.refreshToken) throw new ConnectLifeError("Geen refresh-token", true);
  setToken(
    await readJson(
      await post(
        OAUTH_TOKEN_URL,
        new URLSearchParams({
          client_id: passwordKeys().clientId,
          client_secret: passwordKeys().clientSecret,
          redirect_uri: OAUTH_REDIRECT_URI,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
      ),
      "refresh",
      true,
    ),
  );
}

async function ensureToken(username: string, password: string): Promise<string> {
  const key = `${username}\n${password}`;
  if (tokenKey !== key) {
    token = null;
    tokenKey = key;
  }
  if (token && token.expiresAt > Date.now()) return token.accessToken;
  if (token?.refreshToken) {
    try {
      await refresh();
      return token!.accessToken;
    } catch {
      token = null;
    }
  }
  if (loginFailure && Date.now() - loginFailure.at < LOGIN_BACKOFF_MS) throw loginFailure.error;
  try {
    await login(username, password);
  } catch (err) {
    if (err instanceof ConnectLifeError && err.auth) loginFailure = { at: Date.now(), error: err };
    throw err;
  }
  loginFailure = null;
  return token!.accessToken;
}

/** sha256 van gesorteerde key=value-paren + suffix, RSA-PKCS1 versleuteld met de gateway-sleutel. */
export function signGatewayRequest(payload: Record<string, string>): string {
  const unsigned = Object.keys(payload)
    .filter((k) => k !== "sign")
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join("&");
  const { gatewaySignSuffix, gatewayPublicKey } = passwordKeys();
  const digest = crypto.createHash("sha256").update(unsigned + gatewaySignSuffix).digest();
  return crypto
    .publicEncrypt({ key: gatewayPublicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, digest)
    .toString("base64");
}

async function requestDeviceList(accessToken: string): Promise<{
  devices?: ConnectLifeDevice[];
  errorCode?: number;
}> {
  const params: Record<string, string> = {
    accessToken,
    appId: passwordKeys().gatewayAppId,
    appSecret: passwordKeys().gatewayAppSecret,
    languageId: "12",
    // Nonce; de gateway weigert herhaalde waarden.
    randStr: crypto.randomBytes(16).toString("hex"),
    timeStamp: String(Date.now()),
    timezone: "1.0",
    version: "5.0",
  };
  params.sign = signGatewayRequest(params);

  const res = await fetch(`${GATEWAY_DEVICE_LIST_URL}?${new URLSearchParams(params)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readJson(res, "apparatenlijst", false);
  const response = body.response as
    | { resultCode?: number | string; errorCode?: number; errorDesc?: string; deviceList?: unknown }
    | undefined;
  if (!response) throw new ConnectLifeError("ConnectLife: onverwacht antwoord van de gateway");
  if (response.resultCode != null && Number(response.resultCode) !== 0) {
    if (
      response.errorCode === GATEWAY_INVALID_ACCESS_TOKEN ||
      response.errorCode === GATEWAY_RANDSTR_CHECK_FAILED
    ) {
      return { errorCode: response.errorCode };
    }
    throw new ConnectLifeError(
      `ConnectLife gateway: ${response.errorDesc ?? "fout"} (${response.errorCode ?? "?"})`,
    );
  }
  if (!Array.isArray(response.deviceList)) {
    throw new ConnectLifeError("ConnectLife: apparatenlijst ontbreekt");
  }
  return { devices: response.deviceList as ConnectLifeDevice[] };
}

/** Alle apparaten op het account, inclusief statusList. */
export async function fetchConnectLifeDevices(
  username: string,
  password: string,
): Promise<ConnectLifeDevice[]> {
  let result = await requestDeviceList(await ensureToken(username, password));
  if (result.errorCode === GATEWAY_RANDSTR_CHECK_FAILED) {
    result = await requestDeviceList(await ensureToken(username, password));
  }
  if (result.errorCode === GATEWAY_INVALID_ACCESS_TOKEN) {
    token = null;
    result = await requestDeviceList(await ensureToken(username, password));
  }
  if (!result.devices) {
    throw new ConnectLifeError("ConnectLife: token geweigerd", true);
  }
  return result.devices;
}
