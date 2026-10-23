"use client";

import { useEffect } from "react";
import { applyThemeMode, watchThemeMode } from "@/lib/theme/apply-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyThemeMode();
    return watchThemeMode();
  }, []);

  return <>{children}</>;
}
