"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/weer": { title: "Weer", subtitle: "Eigen weerstation · Harlingen" },
  "/energie": { title: "Energie", subtitle: "Verbruik, zon en batterijen" },
  "/tahoma": { title: "Tahoma", subtitle: "Zonwering en rolluiken" },
  "/hue": { title: "Hue", subtitle: "Verlichting" },
};

function todayLabel(): string {
  return new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  });
}

/** Herberekent elke minuut en bij terugkeer naar de app (PWA uit achtergrond). */
function subscribeToClock(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function AppHeader() {
  const pathname = usePathname();
  // Pagina's worden bij de build vooraf gerenderd: datum alleen in de browser bepalen.
  const today = useSyncExternalStore(subscribeToClock, todayLabel, () => "");
  const page = titles[pathname] ?? { title: "ThuisDash", subtitle: "" };

  return (
    <header className="mb-5 flex items-end justify-between gap-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:pt-8">
      <div className="min-w-0">
        <p className="text-caption min-h-[1lh] font-medium text-surface-muted first-letter:uppercase">
          {today}
        </p>
        <h1 className="mt-0.5 text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-header-fg">
          {page.title}
        </h1>
      </div>
      {page.subtitle ? (
        <p className="text-caption hidden pb-1.5 text-surface-muted sm:block">{page.subtitle}</p>
      ) : null}
    </header>
  );
}
