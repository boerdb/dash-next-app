import { jsonNoStore } from "@/lib/api/no-store";
import { getAstronomyInfo, toAstronomieApi } from "@/lib/astronomy/sun-moon";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonNoStore(toAstronomieApi(getAstronomyInfo()));
}
