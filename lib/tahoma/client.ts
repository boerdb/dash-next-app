import "server-only";
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import type {
  TahomaCommandDef,
  TahomaDevice,
  TahomaSettings,
  RuleAction,
} from "@/lib/tahoma/types";

/**
 * Somfy TaHoma local API (Developer Mode).
 *
 * Auth: Authorization: Bearer <token>
 * Base: https://192.168.1.128:8443 (self-signed cert → rejectUnauthorized: false)
 * Spec: https://github.com/Somfy-Developer/Somfy-TaHoma-Developer-Mode
 */

const API_PREFIX = "/enduser-mobile-web/1/enduserAPI";

interface RequestOptions {
  method: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  /** Geen Bearer-header (alleen /apiVersion). */
  anonymous?: boolean;
}

interface ApiResponse {
  ok: boolean;
  status: number;
  data: unknown;
}

function request(
  baseUrl: string,
  path: string,
  opts: RequestOptions,
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const full = new URL(`${baseUrl.replace(/\/$/, "")}${API_PREFIX}${path}`);
    const isHttps = full.protocol === "https:";
    const lib = isHttps ? https : http;
    const agent = isHttps
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    let bodyStr: string | undefined;
    if (opts.body !== undefined) {
      bodyStr = JSON.stringify(opts.body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();
    }
    if (!opts.anonymous && opts.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }

    const req = lib.request(
      {
        protocol: full.protocol,
        hostname: full.hostname,
        port: full.port,
        path: `${full.pathname}${full.search}`,
        method: opts.method,
        headers,
        agent,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c: Buffer) => (chunks += c.toString("utf8")));
        res.on("end", () => {
          let data: unknown = null;
          if (chunks) {
            try {
              data = JSON.parse(chunks);
            } catch {
              data = chunks;
            }
          }
          resolve({
            ok: res.statusCode != null && res.statusCode < 400,
            status: res.statusCode ?? 0,
            data,
          });
        });
      },
    );
    req.on("error", reject);
    if (opts.timeoutMs) {
      req.setTimeout(opts.timeoutMs, () => req.destroy(new Error("timeout")));
    }
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

interface RawDevice {
  label?: string;
  deviceURL?: string;
  controllableName?: string;
  uiClass?: string;
  widget?: string;
  available?: boolean;
  enabled?: boolean;
  states?: { name: string; value: number | string | boolean | null }[];
  definition?: {
    uiClass?: string;
    widgetName?: string;
    commands?: (TahomaCommandDef & { nparams?: number })[];
  };
}

interface ExecResponse {
  execId?: string;
  errorCode?: string;
  error?: string;
}

function requireToken(settings: TahomaSettings): string {
  const token = settings.token.trim();
  if (!token) throw new Error("Geen developer-token geconfigureerd");
  return token;
}

async function authed(
  settings: TahomaSettings,
  path: string,
  opts: Omit<RequestOptions, "token">,
): Promise<ApiResponse> {
  const token = requireToken(settings);
  const res = await request(settings.baseUrl, path, {
    ...opts,
    token,
    timeoutMs: opts.timeoutMs ?? 10_000,
  });
  if (!res.ok) {
    const err = res.data as { error?: string; errorCode?: string } | null;
    const msg =
      err?.error ||
      err?.errorCode ||
      `Tahoma API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res;
}

function normalizeDevice(raw: RawDevice): TahomaDevice {
  const states: Record<string, number | string | boolean | null> = {};
  for (const s of raw.states ?? []) {
    states[s.name] = s.value;
    // Korte aliassen voor de UI.
    if (s.name === "core:ClosureState" || s.name === "core:TargetClosureState") {
      if (states.closure == null) states.closure = s.value;
    }
    if (s.name === "core:OpenClosedState") states.open = s.value;
    if (s.name === "core:MovingState") states.moving = s.value;
  }
  // Prefer actuele closure boven target.
  if (states["core:ClosureState"] != null) {
    states.closure = states["core:ClosureState"];
  }
  const commands = (raw.definition?.commands ?? []).map((c) => c.commandName);
  return {
    deviceURL: raw.deviceURL ?? "",
    label: (raw.label ?? raw.deviceURL ?? "Onbekend").trim(),
    uiClass: raw.uiClass ?? raw.definition?.uiClass ?? "",
    widget: raw.widget ?? raw.definition?.widgetName ?? "",
    controllableName: raw.controllableName ?? "",
    available: raw.available ?? true,
    states,
    commands,
  };
}

/** Apparaten die de gebruiker wil bedienen (geen protocol-bruggen/wifi/pod). */
const CONTROLLABLE_CLASSES = new Set([
  "ExteriorScreen",
  "Awning",
  "RollerShutter",
  "Window",
  "Curtain",
  "GarageDoor",
  "Gate",
  "ExteriorVenetianBlind",
  "VenetianBlind",
  "Screen",
]);

export function isControllableDevice(d: TahomaDevice): boolean {
  if (CONTROLLABLE_CLASSES.has(d.uiClass)) return true;
  return d.commands.some((c) =>
    ["open", "close", "setClosure", "setPosition", "deploy", "undeploy"].includes(c),
  );
}

/** Lijst apparaten met actuele states. */
export async function fetchDevices(settings: TahomaSettings): Promise<TahomaDevice[]> {
  const res = await authed(settings, "/setup/devices", { method: "GET" });
  const data = res.data;
  const list = Array.isArray(data)
    ? (data as RawDevice[])
    : ((data as { devices?: RawDevice[] } | null)?.devices ?? []);
  return list.map(normalizeDevice).filter(isControllableDevice);
}

/** Forceer een state-refresh — niet in alle firmware aanwezig. */
export async function refreshStates(settings: TahomaSettings): Promise<void> {
  try {
    await authed(settings, "/setup/devices", { method: "GET" });
  } catch {
    /* negeren */
  }
}

/** Voer een actie uit op één apparaat. */
export async function executeAction(
  settings: TahomaSettings,
  deviceURL: string,
  action: RuleAction,
  position?: number,
): Promise<void> {
  const parameters: number[] = [];
  if ((action === "setClosure" || action === "setOrientation") && position != null) {
    parameters.push(position);
  }
  const body = {
    actions: [
      {
        deviceURL,
        commands: [{ name: action, parameters }],
      },
    ],
  };
  const res = await authed(settings, "/exec/apply", { method: "POST", body });
  const data = res.data as ExecResponse | null;
  if (data && (data.errorCode || data.error)) {
    throw new Error(data.error ?? data.errorCode ?? "Actie mislukt");
  }
}

/** Ping via /apiVersion (zonder token) of /setup/gateways (met token). */
export async function ping(settings: TahomaSettings): Promise<boolean> {
  try {
    await authed(settings, "/setup/gateways", { method: "GET", timeoutMs: 8000 });
    return true;
  } catch {
    return false;
  }
}

/** Optioneel: protocolversie zonder auth (handig om bereikbaarheid te testen). */
export async function fetchApiVersion(settings: TahomaSettings): Promise<string | null> {
  try {
    const res = await request(settings.baseUrl, "/apiVersion", {
      method: "GET",
      anonymous: true,
      timeoutMs: 5000,
    });
    if (!res.ok) return null;
    const data = res.data as { protocolVersion?: string } | null;
    return data?.protocolVersion ?? null;
  } catch {
    return null;
  }
}

export function resetClientCache(): void {
  /* Bearer-token zit in settings; geen JWT-cache meer. */
}
