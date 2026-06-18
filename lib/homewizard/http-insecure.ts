import http from "node:http";
import https from "node:https";

const TIMEOUT_MS = 2_000;

export type LocalJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; body: string };

function requestJsonLocal<T>(
  url: string,
  options: {
    method: "GET" | "PUT";
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<LocalJsonResult<T>> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, status: 0, body: "Ongeldige URL" });
      return;
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method,
        headers: options.headers,
        timeout: TIMEOUT_MS,
        ...(parsed.protocol === "https:"
          ? { rejectUnauthorized: false }
          : {}),
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (!status || status < 200 || status >= 300) {
            resolve({ ok: false, status, body });
            return;
          }
          try {
            resolve({ ok: true, data: JSON.parse(body) as T, status });
          } catch {
            resolve({ ok: false, status, body });
          }
        });
      }
    );
    req.on("error", (err) =>
      resolve({
        ok: false,
        status: 0,
        body: err instanceof Error ? err.message : "Verzoek mislukt",
      })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: "Timeout" });
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

/** Lokale HomeWizard-apparaten gebruiken vaak een zelfondertekend HTTPS-certificaat. */
export function fetchJsonLocal<T>(
  url: string,
  headers?: Record<string, string>
): Promise<T | null> {
  return requestJsonLocal<T>(url, { method: "GET", headers }).then((r) =>
    r.ok ? r.data : null
  );
}

export function putJsonLocal<T>(
  url: string,
  payload: unknown,
  headers?: Record<string, string>
): Promise<LocalJsonResult<T>> {
  return requestJsonLocal<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}
