import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { setLightState } from "@/lib/hue/client";
import { getSettings, isConfigured } from "@/lib/hue/settings";

export const dynamic = "force-dynamic";

interface ActionBody {
  lightId: string;
  on?: boolean;
  bri?: number;
}

export async function POST(req: Request) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Hue Bridge niet geconfigureerd" }, { status: 503 });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!body.lightId) {
    return NextResponse.json({ error: "lightId ontbreekt" }, { status: 400 });
  }

  if (body.on === undefined && body.bri === undefined) {
    return NextResponse.json({ error: "on of bri vereist" }, { status: 400 });
  }

  try {
    await setLightState(settings, body.lightId, { on: body.on, bri: body.bri });
    return jsonNoStore({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Actie mislukt" },
      { status: 502 },
    );
  }
}
