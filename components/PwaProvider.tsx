"use client";

import { useEffect, useState } from "react";

export function PwaProvider() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (e) {
        console.warn("Service worker registratie mislukt:", e);
      }
    };

    register();
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] mx-auto max-w-lg">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-zinc-900 px-4 py-3 shadow-xl">
        <p className="text-sm text-zinc-200">Nieuwe versie beschikbaar</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white"
        >
          Ververs
        </button>
      </div>
    </div>
  );
}
