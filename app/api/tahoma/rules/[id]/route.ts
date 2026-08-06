import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getRule, updateRule, deleteRule } from "@/lib/tahoma/rules-store";
import type { TahomaRule } from "@/lib/tahoma/types";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await getRule(id);
  if (!existing) {
    return NextResponse.json({ error: "Regel niet gevonden" }, { status: 404 });
  }

  let body: Partial<TahomaRule>;
  try {
    body = (await req.json()) as Partial<TahomaRule>;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const updated = await updateRule(id, body);
  return jsonNoStore(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteRule(id);
  if (!ok) {
    return NextResponse.json({ error: "Regel niet gevonden" }, { status: 404 });
  }
  return jsonNoStore({ ok: true });
}
