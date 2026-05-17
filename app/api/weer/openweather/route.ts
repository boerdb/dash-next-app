import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { fetchOpenWeatherSupplement } from "@/lib/openweather/fetch";
import { normalizeOpenWeatherSupplement } from "@/lib/openweather/map";

export async function GET() {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeather niet geconfigureerd", code: "NO_KEY" },
      { status: 503 }
    );
  }

  try {
    const data = normalizeOpenWeatherSupplement(
      await fetchOpenWeatherSupplement(apiKey)
    );
    if (!data) {
      return NextResponse.json({ error: "OpenWeather ongeldige response" }, { status: 502 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenWeather fout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
