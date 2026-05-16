import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { fetchOpenWeatherSupplement } from "@/lib/openweather/fetch";

export async function GET() {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeather niet geconfigureerd", code: "NO_KEY" },
      { status: 503 }
    );
  }

  try {
    const data = await fetchOpenWeatherSupplement(apiKey);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenWeather fout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
