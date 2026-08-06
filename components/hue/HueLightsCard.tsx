"use client";

import { useState } from "react";
import { Lightbulb, LightbulbOff, Loader2, RefreshCw } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  briToPercent,
  percentToBri,
  useHueLights,
} from "@/lib/hooks/use-hue";
import type { HueLight } from "@/lib/hue/types";

export function HueLightsCard() {
  const { lights, isLoading, error, mutate } = useHueLights();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (light: HueLight, patch: { on?: boolean; bri?: number }) => {
    setBusy(`${light.id}:${patch.on ?? ""}:${patch.bri ?? ""}`);
    setActionError(null);
    try {
      const res = await fetch("/api/hue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lightId: light.id, ...patch }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Fout ${res.status}`);
      }
      setTimeout(() => void mutate(), 400);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Actie mislukt");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Lampen</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              {lights.length} lampen · aan/uit en dimmen
            </p>
          </div>
          <IconButton onClick={() => mutate()} aria-label="Vernieuwen">
            <RefreshCw className="h-4 w-4" />
          </IconButton>
        </div>

        {actionError ? (
          <p className="text-caption text-accent-danger">{actionError}</p>
        ) : null}

        {isLoading && lights.length === 0 ? (
          <p className="text-caption text-surface-muted">Lampen ophalen…</p>
        ) : error ? (
          <p className="text-caption text-accent-danger">{error.message}</p>
        ) : lights.length === 0 ? (
          <p className="text-caption text-surface-muted">
            Geen lampen gevonden. Controleer de verbinding met de bridge.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {lights.map((light) => (
              <LightRow key={light.id} light={light} busy={busy} onAction={run} />
            ))}
          </ul>
        )}
      </SurfaceBody>
    </Surface>
  );
}

function LightRow({
  light,
  busy,
  onAction,
}: {
  light: HueLight;
  busy: string | null;
  onAction: (light: HueLight, patch: { on?: boolean; bri?: number }) => void;
}) {
  const [brightness, setBrightness] = useState(briToPercent(light.state.bri));
  const isBusy = busy?.startsWith(`${light.id}:`) ?? false;
  const isOn = light.state.on;

  const stateLabel = !light.state.reachable
    ? "Niet bereikbaar"
    : isOn
      ? `${briToPercent(light.state.bri)}%`
      : "Uit";

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{light.name}</p>
          <p className="text-caption text-surface-muted">
            {light.type} · {stateLabel}
          </p>
        </div>
        <Badge variant={light.state.reachable ? (isOn ? "amber" : "default") : "danger"}>
          {light.state.reachable ? (isOn ? "aan" : "uit") : "offline"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy || !light.state.reachable}
          onClick={() => onAction(light, { on: !isOn, bri: isOn ? undefined : percentToBri(brightness || 100) })}
        >
          {isOn ? (
            <>
              <LightbulbOff className="h-4 w-4" />
              Uit
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4" />
              Aan
            </>
          )}
        </Button>
        <span className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={100}
            value={brightness || 1}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-32 accent-[var(--accent-amber)]"
            aria-label="Helderheid"
            disabled={!light.state.reachable}
          />
          <span className="w-10 text-right text-caption tabular-nums text-surface-muted">
            {brightness}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy || !light.state.reachable}
            onClick={() =>
              onAction(light, { on: true, bri: percentToBri(brightness) })
            }
          >
            Dim
          </Button>
        </span>
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-surface-muted" /> : null}
      </div>
    </li>
  );
}
