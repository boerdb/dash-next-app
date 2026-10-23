import { jsonNoStore } from "@/lib/api/no-store";
import { ConnectLifeError } from "@/lib/hisense/connectlife";
import { finishOAuthLink, oauthLinked, oauthPending, startOAuthLink, unlinkOAuth } from "@/lib/hisense/connectlife-oauth";
import { resetHisenseCache } from "@/lib/hisense/status";

export const dynamic = "force-dynamic";

/** Koppelstatus van de browserlogin. */
export async function GET() {
  return jsonNoStore({ linked: await oauthLinked(), pending: await oauthPending() });
}

/**
 * { action: "start" } → { url } van de ConnectLife-loginpagina.
 * { action: "finish", pasted } → wisselt de code uit de geplakte adresbalk om.
 */
export async function POST(req: Request) {
  let body: { action?: string; pasted?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonNoStore({ error: "Ongeldige JSON" }, { status: 400 });
  }

  try {
    if (body.action === "start") {
      return jsonNoStore({ url: await startOAuthLink() });
    }
    if (body.action === "finish" && typeof body.pasted === "string") {
      await finishOAuthLink(body.pasted);
      resetHisenseCache();
      return jsonNoStore({ linked: true });
    }
  } catch (err) {
    const message = err instanceof ConnectLifeError ? err.message : "ConnectLife is niet bereikbaar.";
    return jsonNoStore({ error: message }, { status: 400 });
  }
  return jsonNoStore({ error: "Onbekende actie" }, { status: 400 });
}

export async function DELETE() {
  await unlinkOAuth();
  resetHisenseCache();
  return jsonNoStore({ linked: false });
}
