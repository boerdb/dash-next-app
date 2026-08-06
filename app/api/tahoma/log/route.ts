import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getLog, clearLog } from "@/lib/tahoma/action-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getLog();
  return jsonNoStore({ entries });
}

export async function DELETE() {
  await clearLog();
  return jsonNoStore({ ok: true });
}
