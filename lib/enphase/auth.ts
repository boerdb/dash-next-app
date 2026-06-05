const LOGIN_URL = "https://enlighten.enphaseenergy.com/login/login.json";
const TOKEN_URL = "https://enlighten.enphaseenergy.com/entrez-auth-token";

interface EnlightenLoginResponse {
  session_id?: string;
}

interface EnlightenTokenResponse {
  token?: string;
}

/** JWT ophalen via Enlighten (MFA moet uit staan). */
export async function fetchEnphaseGatewayToken(options: {
  email: string;
  password: string;
  serial: string;
}): Promise<string | null> {
  const body = new URLSearchParams({
    "user[email]": options.email,
    "user[password]": options.password,
  });

  let loginRes: Response;
  try {
    loginRes = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }

  if (!loginRes.ok) return null;

  let loginJson: EnlightenLoginResponse;
  try {
    loginJson = (await loginRes.json()) as EnlightenLoginResponse;
  } catch {
    return null;
  }

  const sessionId = loginJson.session_id;
  if (!sessionId) return null;

  const tokenUrl = `${TOKEN_URL}?serial_num=${encodeURIComponent(options.serial)}`;
  let tokenRes: Response;
  try {
    tokenRes = await fetch(tokenUrl, {
      headers: { cookie: `_enlighten_4_session=${sessionId}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }

  if (!tokenRes.ok) return null;

  let tokenJson: EnlightenTokenResponse;
  try {
    tokenJson = (await tokenRes.json()) as EnlightenTokenResponse;
  } catch {
    return null;
  }

  return tokenJson.token?.trim() || null;
}
