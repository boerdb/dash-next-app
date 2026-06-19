import http from "node:http";
import https from "node:https";

const TIMEOUT_MS = 2_000;

/** Lokale HomeWizard-apparaten gebruiken vaak een zelfondertekend HTTPS-certificaat. */
export function fetchJsonLocal<T>(
  url: string,
  headers?: Record<string, string>
): Promise<T | null> {
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve(null);
      return;
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers,
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
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}
