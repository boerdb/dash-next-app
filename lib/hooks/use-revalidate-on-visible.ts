"use client";

import { useEffect } from "react";

/** Vernieuw data bij openen van tab/PWA en bij terugkeren uit achtergrond. */
export function useRevalidateOnVisible(revalidate: () => void | Promise<void>) {
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") {
        void revalidate();
      }
    };

    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);

    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
    };
  }, [revalidate]);
}
