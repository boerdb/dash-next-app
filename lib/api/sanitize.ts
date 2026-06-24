const SENSITIVE_KEYS = new Set([
  "PASSKEY",
  "passkey",
  "password",
  "api_key",
  "apikey",
  "_wind_samples",
]);

export function sanitizeWeerPayload<T extends Record<string, unknown>>(
  data: T
): Omit<T, "PASSKEY" | "passkey"> {
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_KEYS.has(key)) {
      delete out[key];
    }
  }
  return out as Omit<T, "PASSKEY" | "passkey">;
}
