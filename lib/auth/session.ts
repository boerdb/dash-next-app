/**
 * Eenvoudige wachtwoordlogin voor de tabbladen Energie, Tahoma en Hue.
 *
 * Het cookie bevat `<vervaldatum>.<handtekening>`; de handtekening is een
 * HMAC met het wachtwoord als sleutel. Wachtwoord wijzigen (DASH_PASSWORD)
 * maakt dus meteen alle bestaande logins ongeldig.
 *
 * Alleen Web Crypto, zodat dit zowel in proxy.ts als in route handlers werkt.
 */

export const SESSION_COOKIE = "dash_sessie";
/** Leesbaar voor de browser: alleen een vlag, geeft zelf geen toegang. */
export const FLAG_COOKIE = "dash_ingelogd";
export const SESSION_MAX_AGE_SEC = 365 * 24 * 60 * 60;

/** Paden die een login vragen (pagina's én bijbehorende API's). */
export const PROTECTED_PREFIXES = [
  "/energie",
  "/tahoma",
  "/hue",
  "/api/energie",
  "/api/tahoma",
  "/api/hue",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function password(): string | null {
  const pw = process.env.DASH_PASSWORD?.trim();
  return pw ? pw : null;
}

export function isAuthConfigured(): boolean {
  return password() !== null;
}

const encoder = new TextEncoder();

async function hmacHex(data: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`dash-sessie:${key}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Vergelijking in constante tijd. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = password();
  if (!pw) return false;
  // Via HMAC vergelijken: gelijke lengte, geen lengte-lek.
  const [a, b] = await Promise.all([hmacHex(input, "pw"), hmacHex(pw, "pw")]);
  return safeEqual(a, b);
}

export async function createSessionToken(nowMs = Date.now()): Promise<string> {
  const pw = password();
  if (!pw) throw new Error("DASH_PASSWORD niet ingesteld");
  const exp = Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SEC;
  return `${exp}.${await hmacHex(String(exp), pw)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  nowMs = Date.now()
): Promise<boolean> {
  const pw = password();
  if (!pw || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  return safeEqual(token.slice(dot + 1), await hmacHex(expStr, pw));
}

/** Cronjobs op de server sturen `Authorization: Bearer $CRON_SECRET`. */
export function hasCronSecret(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && !!authorization && safeEqual(authorization, `Bearer ${secret}`);
}

/** Alleen interne doorverwijzingen toestaan na het inloggen. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/energie";
  return next;
}
