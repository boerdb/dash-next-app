"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { jsonFetcher } from "@/lib/fetcher";
import { refreshHisense, useHisenseStatus } from "@/lib/hooks/use-hisense";

async function postLink(body: object): Promise<{ url?: string; error?: string }> {
  const res = await fetch("/api/hisense/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { url?: string; error?: string };
}

export function HisenseLinkCard() {
  const { status } = useHisenseStatus();
  const { data: link, mutate: mutateLink } = useSWR<{ linked: boolean; pending: boolean }>(
    "/api/hisense/link",
    jsonFetcher,
  );
  const [started, setStarted] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linked = status?.linked ?? false;
  const browserLinked = link?.linked ?? false;
  // Na terugkomen van de loginpagina (zelfde venster) weet de server nog dat we wachten.
  const waiting = started || (link?.pending ?? false);

  async function start() {
    setError(null);
    // Venster direct openen; anders blokkeert Safari de pop-up na de await.
    const win = window.open("", "_blank");
    const res = await postLink({ action: "start" });
    if (!res.url) {
      win?.close();
      setError(res.error ?? "Kon de loginpagina niet openen.");
      return;
    }
    setStarted(true);
    if (win) win.location.href = res.url;
    else window.location.href = res.url;
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await postLink({ action: "finish", pasted });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPasted("");
    setStarted(false);
    await Promise.all([mutateLink(), refreshHisense()]);
  }

  async function unlink() {
    await fetch("/api/hisense/link", { method: "DELETE" });
    await Promise.all([mutateLink(), refreshHisense()]);
  }

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3 text-caption leading-relaxed text-surface-muted">
        <p>
          De WD5I1245BBRH/BLX heeft wifi, maar geen API op het thuisnetwerk. De
          status komt uit de ConnectLife-cloud, met hetzelfde account als de
          ConnectLife-app. De server leest de machine elke 30 seconden uit.
        </p>

        {linked ? (
          <p>
            Gekoppeld als{" "}
            <span className="text-foreground">{status?.nickname ?? "wasmachine"}</span>
            {status?.featureCode ? <> · featurecode {status.featureCode}</> : null}
            {browserLinked ? " via de ConnectLife-loginpagina." : " met e-mail en wachtwoord."}
          </p>
        ) : null}

        {!browserLinked ? (
          <div className="space-y-3">
            <p>
              Inloggen met Apple, Google of je ConnectLife-wachtwoord gaat via de
              loginpagina van ConnectLife. Daarna kom je op een pagina van Home
              Assistant terecht. Die mag je negeren: kopieer de hele link uit de
              adresbalk en plak hem hieronder.
            </p>
            <Button variant={waiting ? "outline" : "primary"} size="sm" onClick={() => void start()}>
              {waiting ? "Opnieuw inloggen" : "Inloggen bij ConnectLife"}
            </Button>
            {waiting ? (
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-label text-surface-muted">Link uit de adresbalk</span>
                  <input
                    className="tahoma-input"
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    placeholder="https://my.home-assistant.io/redirect/oauth?code=…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <Button size="sm" disabled={busy || pasted.trim() === ""} onClick={() => void finish()}>
                  {busy ? "Koppelen…" : "Koppelen"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => void unlink()}>
            Ontkoppelen
          </Button>
        )}

        {error ? <p className="text-accent-danger">{error}</p> : null}

        <p>
          Was-droogcombinaties vallen onder apparaattype 025. Programma- en
          fasecodes verschillen per featurecode; een code die de app nog niet
          kent, staat als nummer in de kaart.
        </p>
      </SurfaceBody>
    </Surface>
  );
}
