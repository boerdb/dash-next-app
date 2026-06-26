import type { WeerLive } from "@/lib/api/types";
import { parseLightningTime } from "@/lib/weer/lightning-time";

interface GatewayLightningBlock {
  distance?: string;
  date?: string;
  timestamp?: string;
  count?: string;
  battery?: string;
}

interface GatewayLiveResponse {
  lightning?: GatewayLightningBlock[];
}

function parseGatewayDistance(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("-") || trimmed.includes("F")) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  return Math.round(n);
}

function parseGatewayCount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseGatewayTimestamp(
  raw: string | undefined,
  dateutc?: string
): string | null {
  if (!raw || raw.includes("-") || raw.includes("F")) return null;
  const parsed = parseLightningTime(raw, dateutc);
  return parsed?.isoAmsterdam ?? null;
}

/** Map GW1100 /get_livedata_info → bliksemvelden voor merge in weer_live. */
export function mapGatewayLightning(
  raw: GatewayLiveResponse,
  dateutc?: string
): Partial<WeerLive> {
  const block = raw.lightning?.[0];
  if (!block) return {};

  const lightning_km = parseGatewayDistance(block.distance);
  const lightning_num = parseGatewayCount(block.count);
  const lightning_time =
    parseGatewayTimestamp(block.timestamp, dateutc) ??
    parseGatewayTimestamp(block.date, dateutc);

  const out: Partial<WeerLive> = {};
  if (lightning_km != null) {
    out.lightning_km = lightning_km;
    out.lightning = String(lightning_km);
  }
  if (lightning_num != null) out.lightning_num = lightning_num;
  if (lightning_time) out.lightning_time = lightning_time;
  if (block.battery != null && block.battery !== "") {
    out.wh57batt = block.battery;
  }
  return out;
}

export async function fetchGatewayLiveData(
  gatewayUrl: string
): Promise<GatewayLiveResponse | null> {
  const base = gatewayUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/get_livedata_info`, {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  return (await res.json()) as GatewayLiveResponse;
}
