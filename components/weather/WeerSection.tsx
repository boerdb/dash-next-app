"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeerSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Inklapbare sectie; standaard dicht. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
      ) : null}
    </>
  );
}

export function WeerSection({
  title,
  subtitle,
  children,
  className,
  collapsible = false,
  defaultOpen = false,
}: WeerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  if (!collapsible) {
    return (
      <section className={cn("space-y-3", className)}>
        <header>
          <SectionHeader title={title} subtitle={subtitle} />
        </header>
        <div className="space-y-3">{children}</div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-transparent px-1 py-0.5 text-left transition-colors hover:border-white/5 hover:bg-white/[0.02]"
      >
        <header className="min-w-0 flex-1">
          <SectionHeader title={title} subtitle={subtitle} />
        </header>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="space-y-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
