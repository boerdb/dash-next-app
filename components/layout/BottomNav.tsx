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
    activeClass: "text-sky-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]",
  },
  {
    href: "/energie",
    label: "Energie",
    icon: Zap,
    activeClass: "text-amber-400",
    glowClass: "drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg">
        {links.map(({ href, label, icon: Icon, activeClass, glowClass }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? activeClass : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("h-6 w-6", active && glowClass)} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
