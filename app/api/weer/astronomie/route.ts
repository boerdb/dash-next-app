import { NextResponse } from "next/server";
import { getAstronomyInfo, toAstronomieApi } from "@/lib/astronomy/sun-moon";

export const revalidate = 300;

export async function GET() {
  return NextResponse.json(toAstronomieApi(getAstronomyInfo()));
}
