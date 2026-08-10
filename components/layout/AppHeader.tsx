"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/weer": "Weer",
  "/energie": "Energie",
  "/tahoma": "Tahoma",
  "/hue": "Hue",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="-mx-4 mb-6 flex items-center bg-header-bg px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] shadow-[0_2px_12px_rgba(0,60,120,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:rounded-b-[var(--radius-lg)] lg:px-8">
      <h1 className="text-lg font-semibold tracking-tight text-header-fg">{title}</h1>
    </header>
  );
}
