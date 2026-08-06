import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getRules, addRule } from "@/lib/tahoma/rules-store";
import type { TahomaRule } from "@/lib/tahoma/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await getRules();
  return jsonNoStore({ rules });
}

interface CreateBody {
  name: string;
  deviceURL: string;
  metric: TahomaRule["metric"];
  operator: TahomaRule["operator"];
  threshold: number;
  action: TahomaRule["action"];
  position?: number;
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

  if (!body.name?.trim() || !body.deviceURL?.trim() || !body.metric || !body.action) {
    return NextResponse.json({ error: "Ontbrekende velden" }, { status: 400 });
  }
  if (typeof body.threshold !== "number" || !Number.isFinite(body.threshold)) {
    return NextResponse.json({ error: "Ongeldige drempel" }, { status: 400 });
  }

  const created = await addRule({
    name: body.name.trim(),
    deviceURL: body.deviceURL,
    metric: body.metric,
    operator: body.operator ?? ">",
    threshold: body.threshold,
    action: body.action,
    position: body.position,
    cooldownMin: body.cooldownMin && body.cooldownMin > 0 ? body.cooldownMin : 10,
    enabled: body.enabled ?? true,
  });
  return jsonNoStore(created, { status: 201 });
}
