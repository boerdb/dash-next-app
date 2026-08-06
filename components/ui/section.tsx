"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  subtitle?: string;
  accent?: "weather" | "energy" | "export" | "violet" | "amber";
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const accentBar: Record<NonNullable<SectionProps["accent"]>, string> = {
  weather: "bg-accent-weather",
  energy: "bg-accent-energy",
  export: "bg-accent-export",
  violet: "bg-accent-violet",
  amber: "bg-accent-amber",
};

export function Section({
  title,
  subtitle,
  accent,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("space-y-3", className)} style={{ marginBottom: "var(--space-section)" }}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <SectionHeader title={title} subtitle={subtitle} accent={accent} />
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-surface-muted transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      ) : (
        <SectionHeader title={title} subtitle={subtitle} accent={accent} />
      )}
      {(!collapsible || open) && children}
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle?: string;
  accent?: SectionProps["accent"];
}) {
  return (
    <div className="flex items-start gap-2.5">
      {accent ? (
        <span className={cn("mt-1 h-4 w-1 shrink-0 rounded-full", accentBar[accent])} aria-hidden />
      ) : null}
      <div>
        <h2 className="text-label font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-caption mt-0.5 text-surface-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
