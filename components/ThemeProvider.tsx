"use client";

import { useEffect } from "react";
import {
  applyThemeMode,
  getCurrentThemeMode,
  getNextThemeTransition,
} from "@/lib/theme/apply-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => applyThemeMode(getCurrentThemeMode());

    sync();

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (timeoutId) clearTimeout(timeoutId);
      const next = getNextThemeTransition();
      const delay = Math.max(next.getTime() - Date.now(), 1000);
      timeoutId = setTimeout(() => {
        sync();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <>{children}</>;
}
