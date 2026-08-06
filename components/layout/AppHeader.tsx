"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/weer": "Weer",
  "/energie": "Energie",
  "/tahoma": "Tahoma",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-6 flex items-center border-b border-border bg-nav-bg/95 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-0 lg:px-0 lg:pb-6">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
    </header>
  );
}
