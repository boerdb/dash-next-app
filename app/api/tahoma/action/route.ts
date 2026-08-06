import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getSettings, isConfigured } from "@/lib/tahoma/settings";
import { executeAction } from "@/lib/tahoma/client";
import { appendLog } from "@/lib/tahoma/action-log";
import { fetchDevices } from "@/lib/tahoma/client";
import type { RuleAction } from "@/lib/tahoma/types";

export const dynamic = "force-dynamic";

interface ActionBody {
  deviceURL: string;
  action: RuleAction;
  position?: number;
}

const ALLOWED: RuleAction[] = ["close", "open", "stop", "setClosure", "setOrientation"];

export async function POST(req: Request) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Tahoma-box niet geconfigureerd" }, { status: 503 });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!body.deviceURL || !ALLOWED.includes(body.action)) {
    return NextResponse.json({ error: "deviceURL of action ontbreekt/is ongeldig" }, { status: 400 });
  }

  let deviceName = body.deviceURL;
  try {
    const devices = await fetchDevices(settings);
    deviceName = devices.find((d) => d.deviceURL === body.deviceURL)?.label ?? deviceName;
  } catch {
    // Naam is cosmetisch; actie kan gewoon doorgaan.
  }

  let status: "ok" | "error" = "ok";
  let message: string | undefined;
  try {
    await executeAction(settings, body.deviceURL, body.action, body.position);
  } catch (e) {
    status = "error";
    message = e instanceof Error ? e.message : "Actie mislukt";
  }

  await appendLog({
    at: new Date().toISOString(),
    ruleId: null,
    ruleName: null,
    deviceURL: body.deviceURL,
    deviceName,
    action: body.action,
    position: body.position,
    trigger: null,
    status,
    message,
  });

  if (status === "error") {
    return NextResponse.json({ error: message ?? "Actie mislukt" }, { status: 502 });
  }
  return jsonNoStore({ ok: true });
}
