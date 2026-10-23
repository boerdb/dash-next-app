import { jsonNoStore } from "@/lib/api/no-store";
import { getHisenseRaw, getHisenseStatus } from "@/lib/hisense/status";

export const dynamic = "force-dynamic";

/**
 * Live status van de wasmachine via ConnectLife.
 * ?raw=1 met Bearer CRON_SECRET geeft de ruwe statusList (codes nakijken):
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3000/api/hisense/status?raw=1"
 */
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("raw") === "1") {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      return jsonNoStore(await getHisenseRaw());
    } catch (err) {
      return jsonNoStore({ error: err instanceof Error ? err.message : "Fout" }, { status: 502 });
    }
  }
  return jsonNoStore(await getHisenseStatus());
}
