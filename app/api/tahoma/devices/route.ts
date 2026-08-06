import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getSettings, isConfigured } from "@/lib/tahoma/settings";
import { fetchDevices, refreshStates } from "@/lib/tahoma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Tahoma-box niet geconfigureerd" }, { status: 503 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("refresh") === "1") {
    void refreshStates(settings);
  }

  try {
    const devices = await fetchDevices(settings);
    return jsonNoStore({ devices, updatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Apparaten ophalen mislukt" },
      { status: 502 },
    );
  }
}
