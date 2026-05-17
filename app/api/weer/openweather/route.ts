import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import {
  fetchOpenWeatherSupplement,
  fetchOneCallRaw,
} from "@/lib/openweather/fetch";
import {
  getOneCallRawCurrentDebug,
  normalizeOpenWeatherSupplement,
} from "@/lib/openweather/map";

export async function GET() {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeather niet geconfigureerd", code: "NO_KEY" },
      { status: 503 }
    );
  }

  try {
    let prefetchedOneCall;
    if (process.env.NODE_ENV === "development") {
      try {
        prefetchedOneCall = await fetchOneCallRaw(apiKey);
      } catch {
        /* val terug op fetchOpenWeatherSupplement met 2.5-fallback */
      }
    }
    const data = normalizeOpenWeatherSupplement(
      await fetchOpenWeatherSupplement(apiKey, prefetchedOneCall)
    );
    if (!data) {
      return NextResponse.json({ error: "OpenWeather ongeldige response" }, { status: 502 });
    }
    const body =
      process.env.NODE_ENV === "development" && prefetchedOneCall
        ? { ...data, _debug: getOneCallRawCurrentDebug(prefetchedOneCall) }
        : data;
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenWeather fout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
