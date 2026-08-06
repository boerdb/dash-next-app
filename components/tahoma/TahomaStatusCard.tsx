"use client";

import { useState } from "react";
import { RefreshCw, Save, Power } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTahomaSettings, useTahomaStatus } from "@/lib/hooks/use-tahoma";
import { cn } from "@/lib/utils";

export function TahomaStatusCard() {
  const { settings, mutate: mutateSettings } = useTahomaSettings();
  const { status, mutate: mutateStatus } = useTahomaStatus();

  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [pollInterval, setPollInterval] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && settings) {
    setBaseUrl(settings.baseUrl);
    setPollInterval(settings.pollIntervalSec);
    setHydrated(true);
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tahoma/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          token: token ? token.trim() : undefined,
          pollIntervalSec: pollInterval,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Fout ${res.status}`);
      }
      setToken("");
      await Promise.all([mutateSettings(), mutateStatus()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    if (!settings?.configured) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tahoma/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !settings.enabled }),
      });
      if (!res.ok) throw new Error("Wisselen mislukt");
      await Promise.all([mutateSettings(), mutateStatus()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wisselen mislukt");
    } finally {
      setSaving(false);
    }
  };

  const connected = status?.connected ?? false;

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Tahoma-box</h3>
            <p className="text-caption mt-0.5 text-surface-muted">
              Somfy Developer Mode · Bearer-token · poort 8443
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="export">Verbonden</Badge>
            ) : settings?.configured ? (
              <Badge variant="danger">Offline</Badge>
            ) : (
              <Badge>Niet ingesteld</Badge>
            )}
            {status?.deviceCount != null ? (
              <Badge variant="violet">{status.deviceCount} apparaten</Badge>
            ) : null}
          </div>
        </div>

        {status?.error ? (
          <p className="text-caption rounded-[var(--radius-sm)] border border-accent-danger/20 bg-accent-danger/5 px-3 py-2 text-accent-danger">
            {status.error}
          </p>
        ) : null}

        <div className="grid gap-3">
          <Field label="Base URL" hint="https://192.168.1.128:8443">
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://192.168.1.128:8443"
              className="tahoma-input"
            />
          </Field>
          <Field
            label="Developer-token"
            hint={
              settings?.hasToken
                ? "opgeslagen · leeg laten = behouden"
                : "uit Tahoma-app → Developer Mode"
            }
          >
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={settings?.hasToken ? "••••••••••••••••••••" : "plak hier je token"}
              className="tahoma-input font-mono"
              autoComplete="off"
            />
          </Field>
          <Field label="Poll-interval (sec)" hint="hoe vaak de cron de regels evalueert">
            <input
              type="number"
              min={10}
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value) || 60)}
              className="tahoma-input w-32"
            />
          </Field>
        </div>

        {error ? <p className="text-caption text-accent-danger">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={saving || !hydrated}>
            <Save className="h-4 w-4" />
            Opslaan
          </Button>
          <Button
            variant="outline"
            onClick={toggleEnabled}
            disabled={saving || !settings?.configured}
          >
            <Power className="h-4 w-4" />
            {settings?.enabled ? "Automatisering uit" : "Automatisering aan"}
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
          Cron (elke minuut):
          <br />
          <code className="text-surface-muted">
            */1 * * * * curl -sf -H &quot;Authorization: Bearer $CRON_SECRET&quot;
            http://127.0.0.1:3000/api/tahoma/tick
          </code>
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
