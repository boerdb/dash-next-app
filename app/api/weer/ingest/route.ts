import { NextRequest, NextResponse } from "next/server";
import { isDirectDbEnabled } from "@/lib/db/pool";
import { ingestWeerLive } from "@/lib/db/weer-store";
import {
  parseEcowittPayload,
  paramsFromFormData,
  paramsFromSearchParams,
} from "@/lib/weer/ecowitt-ingest";

export const dynamic = "force-dynamic";

async function handleIngest(params: Record<string, string>) {
  if (!isDirectDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL niet geconfigureerd" },
      { status: 503 }
    );
  }
  if (Object.keys(params).length === 0) {
    return NextResponse.json({ error: "Geen data" }, { status: 400 });
  }

  const raw = parseEcowittPayload(params);
  await ingestWeerLive(raw);
  return new NextResponse("SUCCESS", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/** Ecowitt custom upload (GET met querystring of POST form). */
export async function GET(req: NextRequest) {
  try {
    return await handleIngest(paramsFromSearchParams(req.nextUrl.searchParams));
  } catch (e) {
    console.error("Ecowitt ingest GET:", e);
    return NextResponse.json({ error: "Ingest mislukt" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let params: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      params = await paramsFromFormData(await req.formData());
    } else if (contentType.includes("multipart/form-data")) {
      params = await paramsFromFormData(await req.formData());
    } else {
      const text = await req.text();
      if (text.includes("=")) {
        params = paramsFromSearchParams(new URLSearchParams(text));
      } else {
        return NextResponse.json({ error: "Onbekend formaat" }, { status: 400 });
      }
    }

    return await handleIngest(params);
  } catch (e) {
    console.error("Ecowitt ingest POST:", e);
    return NextResponse.json({ error: "Ingest mislukt" }, { status: 500 });
  }
}
