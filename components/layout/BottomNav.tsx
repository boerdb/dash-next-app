"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudSun, Zap } from "lucide-react";
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
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  accent,
  activeBg,
  active,
  layout,
}: {
  href: string;
  label: string;
  icon: typeof CloudSun;
  accent: string;
  activeBg: string;
  active: boolean;
  layout: "bottom" | "side";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 font-medium transition-colors",
        layout === "bottom" && "flex-1 flex-col py-3 text-xs",
        layout === "side" && "rounded-[var(--radius-sm)] px-3 py-2.5 text-sm",
        active
          ? cn(accent, "font-semibold", activeBg)
          : "text-nav-inactive hover:text-nav-hover"
      )}
    >
      {active && layout === "bottom" ? (
        <span className={cn("absolute inset-x-6 top-0 h-0.5 rounded-full", accent.replace("text-", "bg-"))} />
      ) : null}
      <Icon className={layout === "bottom" ? "h-6 w-6" : "h-5 w-5"} />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-nav-bg pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <div className="mx-auto flex w-full max-w-md">
          {links.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              active={pathname === link.href}
              layout="bottom"
            />
          ))}
        </div>
      </nav>

      <nav className="hidden md:flex md:w-48 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-border md:bg-nav-bg md:p-4 lg:w-52">
        <p className="text-label mb-3 px-3 text-surface-muted">Dashboard</p>
        {links.map((link) => (
          <NavLink
            key={link.href}
            {...link}
            active={pathname === link.href}
            layout="side"
          />
        ))}
      </nav>
    </>
  );
}
