"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const titles: Record<string, string> = {
  "/weer": "Weer",
  "/energie": "Energie",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-card-border bg-nav-bg/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
      <h1 className="text-sm font-semibold tracking-wide text-foreground">{title}</h1>
      <ThemeToggle />
    </header>
  );
}
