import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { fetchKnmiWaarschuwingen } from "@/lib/knmi/fetch-warnings";
import { KNMI_DEFAULT_PROVINCE } from "@/lib/knmi/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = env.KNMI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KNMI niet geconfigureerd", code: "NO_KEY" },
      { status: 503 }
    );
  }

  const province = env.KNMI_PROVINCE?.toUpperCase() ?? KNMI_DEFAULT_PROVINCE;

  try {
    const data = await fetchKnmiWaarschuwingen(apiKey, province);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "KNMI waarschuwingen fout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
