import { jsonNoStore } from "@/lib/api/no-store";
import { unlinkedStatus } from "@/lib/hisense/profile";

export const dynamic = "force-dynamic";

/** Voorbereiding: vaste machinegegevens, nog geen ConnectLife-sessie. */
export async function GET() {
  return jsonNoStore(unlinkedStatus());
}
