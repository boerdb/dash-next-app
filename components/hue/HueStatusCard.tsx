"use client";

import { useState } from "react";
import { Link2, RefreshCw, Save } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHueSettings, useHueStatus } from "@/lib/hooks/use-hue";
import { cn } from "@/lib/utils";

export function HueStatusCard() {
  const { settings, mutate: mutateSettings } = useHueSettings();
  const { status, mutate: mutateStatus } = useHueStatus();

  const [bridgeIp, setBridgeIp] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkOk, setLinkOk] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && settings) {
    setBridgeIp(settings.bridgeIp);
    setHydrated(true);
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    setLinkOk(null);
    try {
      const res = await fetch("/api/hue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bridgeIp: bridgeIp.trim(),
          username: username ? username.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Fout ${res.status}`);
      }
      setUsername("");
      await Promise.all([mutateSettings(), mutateStatus()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  const linkBridge = async () => {
    setLinking(true);
    setError(null);
    setLinkOk(null);
    try {
      if (bridgeIp.trim() !== settings?.bridgeIp) {
        await fetch("/api/hue/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bridgeIp: bridgeIp.trim() }),
        });
      }
      const res = await fetch("/api/hue/register", { method: "POST" });
      const b = (await res.json().catch(() => ({}))) as { error?: string; username?: string };
      if (!res.ok) throw new Error(b.error ?? `Fout ${res.status}`);
      setLinkOk("Bridge gekoppeld — application key opgeslagen");
      await Promise.all([mutateSettings(), mutateStatus()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koppelen mislukt");
    } finally {
      setLinking(false);
    }
  };

  const connected = status?.connected ?? false;

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Hue Bridge</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              Philips Hue · lokaal · {status?.bridgeName ?? "192.168.1.76"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="amber">Verbonden</Badge>
            ) : settings?.configured ? (
              <Badge variant="danger">Offline</Badge>
            ) : (
              <Badge>Niet ingesteld</Badge>
            )}
            {status?.lightCount != null ? (
              <Badge variant="amber">{status.lightCount} lampen</Badge>
            ) : null}
          </div>
        </div>

        {status?.error ? (
          <p className="text-caption rounded-[var(--radius-sm)] border border-accent-danger/20 bg-accent-danger/5 px-3 py-2 text-accent-danger">
            {status.error}
          </p>
        ) : null}

        <div className="grid gap-3">
          <Field label="Bridge IP" hint="192.168.1.76">
            <input
              value={bridgeIp}
              onChange={(e) => setBridgeIp(e.target.value)}
              placeholder="192.168.1.76"
              className="tahoma-input"
            />
          </Field>
          <Field
            label="Application key"
            hint={
              settings?.hasUsername
                ? "opgeslagen · leeg laten = behouden · of koppel via knop"
                : "druk link-knop op bridge en klik Koppelen"
            }
          >
            <input
              type="password"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={settings?.hasUsername ? "••••••••••••••••••••" : "wordt automatisch aangemaakt"}
              className="tahoma-input font-mono"
              autoComplete="off"
            />
          </Field>
        </div>

        {error ? <p className="text-caption text-accent-danger">{error}</p> : null}
        {linkOk ? (
          <p className="text-caption text-accent-export">{linkOk}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={saving || !hydrated}>
            <Save className="h-4 w-4" />
            Opslaan
          </Button>
          <Button variant="outline" onClick={linkBridge} disabled={linking || !bridgeIp.trim()}>
            <Link2 className="h-4 w-4" />
            {linking ? "Koppelen…" : "Koppelen"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutateStatus()}
            className={cn("ml-auto")}
          >
            <RefreshCw className="h-4 w-4" />
            Status
          </Button>
        </div>

        <p className="text-caption text-surface-muted">
          Eerste keer: druk de ronde link-knop op de bridge in en klik binnen 30 seconden op
          Koppelen.
        </p>
      </SurfaceBody>
    </Surface>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-label text-surface-muted">{label}</span>
      {children}
      {hint ? <span className="block text-caption text-surface-muted">{hint}</span> : null}
    </label>
  );
}
