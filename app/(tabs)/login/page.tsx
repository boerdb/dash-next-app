"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { isLoggedInClient, subscribeLogin, notifyLoginChange } from "@/lib/auth/client";

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/energie";
  return next;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const ingelogd = useSyncExternalStore(subscribeLogin, isLoggedInClient, () => false);

  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function inloggen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wachtwoord }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFout(body?.error ?? `Fout ${res.status}`);
        return;
      }
      notifyLoginChange();
      router.replace(next);
      router.refresh();
    } catch {
      setFout("Geen verbinding met de server");
    } finally {
      setBezig(false);
    }
  }

  async function uitloggen() {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => null);
    notifyLoginChange();
    router.replace("/weer");
  }

  if (ingelogd) {
    return (
      <Surface className="mx-auto max-w-sm">
        <SurfaceBody className="space-y-4 text-center">
          <p className="text-sm text-surface-muted">
            Je bent ingelogd op dit apparaat. Energie, Tahoma en Hue zijn open.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => router.replace(next)}>Verder</Button>
            <Button variant="outline" onClick={uitloggen}>
              <LogOut className="h-4 w-4" /> Uitloggen
            </Button>
          </div>
        </SurfaceBody>
      </Surface>
    );
  }

  return (
    <Surface className="mx-auto max-w-sm">
      <SurfaceBody>
        <form onSubmit={inloggen} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-amber-soft text-accent-amber">
              <Lock className="h-5 w-5" />
            </span>
            <p className="text-sm text-surface-muted">
              Energie, rolluiken en lampen zijn afgeschermd. Het weer is voor iedereen.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Wachtwoord</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          {fout ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{fout}</p> : null}
          <Button type="submit" className="w-full" disabled={bezig || !wachtwoord}>
            {bezig ? "Even geduld…" : "Inloggen"}
          </Button>
          <p className="text-center text-xs text-surface-muted">Je blijft een jaar ingelogd op dit apparaat.</p>
        </form>
      </SurfaceBody>
    </Surface>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
