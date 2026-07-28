"use client";

import { AlertTriangle } from "lucide-react";
import type { KnmiWaarschuwingenApi, KnmiWarningItem } from "@/lib/api/types";
import { KNMI_PROVINCE_LABELS } from "@/lib/knmi/constants";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KnmiWarningsCardProps {
  data: KnmiWaarschuwingenApi;
}

const LEVEL_STYLES: Record<
  1 | 2 | 3,
  {
    border: string;
    badge: "energy" | "danger" | "default";
    title: string;
    icon: string;
    muted: string;
  }
> = {
  1: {
    border: "border-accent-energy/40",
    badge: "energy",
    title: "text-foreground",
    icon: "text-accent-energy",
    muted: "text-surface-muted",
  },
  2: {
    border: "border-accent-energy/60",
    badge: "energy",
    title: "text-foreground",
    icon: "text-accent-energy",
    muted: "text-surface-muted",
  },
  3: {
    border: "border-accent-danger/60",
    badge: "danger",
    title: "text-foreground",
    icon: "text-accent-danger",
    muted: "text-surface-muted",
  },
};

export function KnmiWarningsCard({ data }: KnmiWarningsCardProps) {
  if (data.maxLevel === 0 || data.warnings.length === 0) {
    return null;
  }

  const provinceLabel = KNMI_PROVINCE_LABELS[data.province] ?? data.province;
  const headerStyle = LEVEL_STYLES[data.maxLevel as 1 | 2 | 3] ?? LEVEL_STYLES[1];

  return (
    <Surface level="raised" className={cn("border-2", headerStyle.border)}>
      <SurfaceBody className="space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle
              className={cn("mt-0.5 h-5 w-5 shrink-0", headerStyle.icon)}
              aria-hidden
            />
            <div>
              <p className={cn("text-sm font-semibold", headerStyle.title)}>
                KNMI · {data.maxLevelLabel}
              </p>
              <p className={cn("text-caption mt-0.5", headerStyle.muted)}>
                Officiële waarschuwing · {provinceLabel}
              </p>
            </div>
          </div>
          <Badge variant={headerStyle.badge}>{data.maxLevelLabel}</Badge>
        </header>

        <ul className="space-y-2">
          {data.warnings.map((warning) => (
            <KnmiWarningRow key={warningKey(warning)} warning={warning} />
          ))}
        </ul>

        <p className={cn("text-caption", headerStyle.muted)}>
          Bron: KNMI Data Platform · ververst ca. elk kwartier
        </p>
      </SurfaceBody>
    </Surface>
  );
}

function warningKey(w: KnmiWarningItem): string {
  return `${w.level}-${w.phenomenonId}-${w.validFrom}-${w.texts[0] ?? ""}`;
}

function KnmiWarningRow({ warning }: { warning: KnmiWarningItem }) {
  const style = LEVEL_STYLES[warning.level];

  return (
    <li className="rounded-[var(--radius-sm)] border border-border-subtle bg-surface-subtle px-3 py-2.5">
      <p className={cn("text-sm font-medium", style.title)}>{warning.phenomenonLabel}</p>
      <p className={cn("text-caption mt-0.5", style.muted)}>
        {warning.levelLabel}
        {warning.validFrom !== warning.validTo
          ? ` · ${warning.validFrom} – ${warning.validTo}`
          : ` · ${warning.validFrom}`}
      </p>
      {warning.texts.length > 0 ? (
        <details className="group mt-1.5">
          <summary className={cn("text-caption cursor-pointer list-none marker:content-none", style.muted)}>
            <span className="underline decoration-current/30 underline-offset-2 group-open:hidden">
              Toon toelichting
            </span>
            <span className="hidden underline decoration-current/30 underline-offset-2 group-open:inline">
              Verberg toelichting
            </span>
          </summary>
          <div className={cn("text-caption mt-1.5 space-y-1 leading-relaxed", style.title)}>
            {warning.texts.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </details>
      ) : null}
    </li>
  );
}
