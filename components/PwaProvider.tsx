"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISS_KEY = "pwa-install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [updateReloading, setUpdateReloading] = useState(false);

  const dismissInstall = useCallback(() => {
    setShowInstall(false);
    setShowIosHint(false);
    try {
      sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      return;
    }

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      setUpdateReloading(true);
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (e) {
        console.warn("Service worker registratie mislukt:", e);
      }
    };

    void register();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
    if (outcome === "accepted") dismissInstall();
  };

  if (updateReloading) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[60] mx-auto max-w-lg">
        <div className="rounded-2xl border border-sky-500/30 bg-zinc-900 px-4 py-3 text-center text-sm text-zinc-200 shadow-xl">
          Bezig met bijwerken…
        </div>
      </div>
    );
  }

  if (showInstall && deferredPrompt) {
    return (
      <InstallBanner
        title="App installeren"
        description="Voeg Weer & Energie toe aan je startscherm voor snelle toegang."
        primaryLabel="Installeren"
        onPrimary={onInstallClick}
        onDismiss={dismissInstall}
        icon={Download}
      />
    );
  }

  if (showIosHint) {
    return (
      <InstallBanner
        title="Toevoegen aan beginscherm"
        description="Tik op Deel en kies «Zet op beginscherm» om de app te installeren."
        primaryLabel="Begrepen"
        onPrimary={dismissInstall}
        onDismiss={dismissInstall}
        icon={Share}
      />
    );
  }

  return null;
}

function InstallBanner({
  title,
  description,
  primaryLabel,
  onPrimary,
  onDismiss,
  icon: Icon,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss: () => void;
  icon: typeof Download;
}) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] mx-auto max-w-lg">
      <div className="rounded-2xl border border-sky-500/30 bg-zinc-900 p-4 shadow-xl">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
            <Icon className="h-5 w-5 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onPrimary}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white"
              >
                {primaryLabel}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Later
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
