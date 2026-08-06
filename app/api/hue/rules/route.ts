import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getRules, addRule } from "@/lib/hue/rules-store";
import type { HueRule } from "@/lib/hue/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await getRules();
  return jsonNoStore({ rules });
}

interface CreateBody {
  name: string;
  lightId: string;
  metric: HueRule["metric"];
  operator: HueRule["operator"];
  threshold: number;
  action: HueRule["action"];
  brightness?: number;
  cooldownMin?: number;
  enabled?: boolean;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.lightId?.trim() || !body.metric || !body.action) {
    return NextResponse.json({ error: "Ontbrekende velden" }, { status: 400 });
  }
  if (typeof body.threshold !== "number" || !Number.isFinite(body.threshold)) {
    return NextResponse.json({ error: "Ongeldige drempel" }, { status: 400 });
  }

  const created = await addRule({
    name: body.name.trim(),
    lightId: body.lightId,
    metric: body.metric,
    operator: body.operator ?? ">",
    threshold: body.threshold,
    action: body.action,
    brightness: body.brightness,
    cooldownMin: body.cooldownMin && body.cooldownMin > 0 ? body.cooldownMin : 10,
    enabled: body.enabled ?? true,
  });
  return jsonNoStore(created, { status: 201 });
}
