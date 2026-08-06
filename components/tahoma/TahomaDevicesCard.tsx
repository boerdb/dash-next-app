"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTahomaDevices } from "@/lib/hooks/use-tahoma";
import type { TahomaDevice } from "@/lib/tahoma/types";

export function TahomaDevicesCard() {
  const { devices, isLoading, error, mutate } = useTahomaDevices();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (device: TahomaDevice, action: string, position?: number) => {
    setBusy(`${device.deviceURL}:${action}:${position ?? ""}`);
    setActionError(null);
    try {
      const res = await fetch("/api/tahoma/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceURL: device.deviceURL, action, position }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Fout ${res.status}`);
      }
      // Geef de box even tijd en ververs daarna de states.
      setTimeout(() => void mutate(), 1500);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Actie mislukt");
    } finally {
      setBusy(null);
    }
  };

  const supports = (d: TahomaDevice, cmd: string) => d.commands.includes(cmd);

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Apparaten</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              {devices.length} apparaten · handmatig te bedienen
            </p>
          </div>
          <IconButton onClick={() => mutate()} aria-label="Vernieuwen">
            <RefreshCw className="h-4 w-4" />
          </IconButton>
        </div>

        {actionError ? (
          <p className="text-caption text-accent-danger">{actionError}</p>
        ) : null}

        {isLoading && devices.length === 0 ? (
          <p className="text-caption text-surface-muted">Apparaten ophalen…</p>
        ) : error ? (
          <p className="text-caption text-accent-danger">
            {error.message}
          </p>
        ) : devices.length === 0 ? (
          <p className="text-caption text-surface-muted">
            Geen apparaten gevonden. Controleer de verbinding met de box.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {devices.map((d) => (
              <DeviceRow
                key={d.deviceURL}
                device={d}
                busy={busy}
                onAction={run}
                supports={supports}
              />
            ))}
          </ul>
        )}
      </SurfaceBody>
    </Surface>
  );
}

function DeviceRow({
  device,
  busy,
  onAction,
  supports,
}: {
  device: TahomaDevice;
  busy: string | null;
  onAction: (d: TahomaDevice, action: string, position?: number) => void;
  supports: (d: TahomaDevice, cmd: string) => boolean;
}) {
  const [position, setPosition] = useState<number>(
    typeof device.states.closure === "number" ? (device.states.closure as number) : 100,
  );
  const isBusy = busy?.startsWith(`${device.deviceURL}:`) ?? false;

  const closure = device.states.closure;
  const openState = device.states.open;
  const stateLabel =
    openState === "open"
      ? "Open"
      : openState === "closed"
        ? "Gesloten"
        : closure != null
          ? `${closure}% gesloten`
          : device.available
            ? "Onbekend"
            : "Niet beschikbaar";

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{device.label}</p>
          <p className="text-caption text-surface-muted">
            {device.uiClass || "Onbekend type"} · {stateLabel}
          </p>
        </div>
        <Badge variant={device.available ? "default" : "danger"}>
          {device.available ? "online" : "offline"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {supports(device, "open") ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => onAction(device, "open")}
          >
            <ChevronUp className="h-4 w-4" />
            Open
          </Button>
        ) : null}
        {supports(device, "stop") ? (
          <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => onAction(device, "stop")}>
            Stop
          </Button>
        ) : null}
        {supports(device, "close") ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => onAction(device, "close")}
          >
            <ChevronDown className="h-4 w-4" />
            Dicht
          </Button>
        ) : null}
        {supports(device, "setClosure") ? (
          <span className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-32 accent-[var(--primary)]"
              aria-label="Stand"
            />
            <span className="w-10 text-right text-caption tabular-nums text-surface-muted">
              {position}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => onAction(device, "setClosure", position)}
            >
              Zet
            </Button>
          </span>
        ) : null}
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin text-surface-muted" /> : null}
      </div>
    </li>
  );
}
