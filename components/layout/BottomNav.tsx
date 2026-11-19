"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CloudSun, Zap, Blinds, Lightbulb, Lock } from "lucide-react";
import { isLoggedInClient, subscribeLogin } from "@/lib/auth/client";

const PROTECTED = new Set(["/energie", "/tahoma", "/hue"]);
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/weer",
    label: "Weer",
    icon: CloudSun,
    accent: "text-accent-weather",
    activeBg: "bg-accent-weather-soft",
  },
  {
    href: "/energie",
    label: "Energie",
    icon: Zap,
    accent: "text-accent-energy",
    activeBg: "bg-accent-energy-soft",
  },
  {
    href: "/tahoma",
    label: "Tahoma",
    icon: Blinds,
    accent: "text-accent-violet",
    activeBg: "bg-accent-violet-soft",
  },
  {
    href: "/hue",
    label: "Hue",
    icon: Lightbulb,
    accent: "text-accent-amber",
    activeBg: "bg-accent-amber-soft",
  },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  accent,
  activeBg,
  active,
  layout,
  locked,
}: {
  href: string;
  label: string;
  icon: typeof CloudSun;
  accent: string;
  activeBg: string;
  active: boolean;
  layout: "bottom" | "side";
  locked: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center font-medium transition-colors duration-200",
        layout === "bottom" &&
          "flex-1 flex-col gap-1 rounded-[1.1rem] py-2 text-[0.6875rem]",
        layout === "side" && "gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm",
        active
          ? cn(accent, activeBg, "font-semibold")
          : "text-nav-inactive hover:text-nav-hover"
      )}
    >
      <span className="relative">
        <Icon className={layout === "bottom" ? "h-[1.35rem] w-[1.35rem]" : "h-5 w-5"} strokeWidth={active ? 2.2 : 1.8} />
        {locked ? (
          <Lock
            aria-label="vergrendeld"
            className="absolute -right-1.5 -top-1 h-3 w-3 rounded-full bg-nav-bg p-[1px]"
            strokeWidth={2.6}
          />
        ) : null}
      </span>
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const ingelogd = useSyncExternalStore(subscribeLogin, isLoggedInClient, () => true);

  return (
    <>
      {/* Zwevende balk op mobiel; marge onder volgt de home-indicator. */}
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:hidden">
        <div className="mx-auto flex w-full max-w-md gap-1 rounded-[1.5rem] border border-border bg-nav-bg p-1.5 shadow-[var(--nav-shadow)] backdrop-blur-xl">
          {links.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              active={pathname === link.href}
              locked={PROTECTED.has(link.href) && !ingelogd}
              layout="bottom"
            />
          ))}
        </div>
      </nav>

      <nav className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-52 md:shrink-0 md:flex-col md:gap-1 md:px-4 md:py-8 lg:w-56">
        <div className="mb-8 flex items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-primary text-primary-foreground">
            <CloudSun className="h-4.5 w-4.5" strokeWidth={2.2} />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">ThuisDash</span>
        </div>
        {links.map((link) => (
          <NavLink
            key={link.href}
            {...link}
            active={pathname === link.href}
            locked={PROTECTED.has(link.href) && !ingelogd}
            layout="side"
          />
        ))}
      </nav>
    </>
  );
}
