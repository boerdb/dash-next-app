"use client";

import { AlertTriangle } from "lucide-react";
import type { KnmiWaarschuwingenApi, KnmiWarningItem } from "@/lib/api/types";
import { KNMI_PROVINCE_LABELS } from "@/lib/knmi/constants";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KnmiWarningsCardProps {
  data: KnmiWaarschuwingenApi;
}

const LEVEL_STYLES: Record<
  1 | 2 | 3,
  {
    border: string;
    cardBg: string;
    rowBg: string;
    badge: string;
    title: string;
    icon: string;
    muted: string;
  }
> = {
  1: {
    border: "border-yellow-500/60 dark:border-yellow-500/50",
    cardBg: "bg-yellow-50 dark:bg-yellow-950/50",
    rowBg: "bg-yellow-100/80 dark:bg-yellow-950/30",
    badge: "bg-yellow-500/20 text-yellow-900 dark:bg-yellow-500/25 dark:text-yellow-200",
    title: "text-yellow-950 dark:text-yellow-100",
    icon: "text-yellow-600 dark:text-yellow-400",
    muted: "text-yellow-900/70 dark:text-yellow-200/70",
  },
  2: {
    border: "border-orange-500/60 dark:border-orange-500/50",
    cardBg: "bg-orange-50 dark:bg-orange-950/50",
    rowBg: "bg-orange-100/80 dark:bg-orange-950/30",
    badge: "bg-orange-500/20 text-orange-950 dark:bg-orange-500/25 dark:text-orange-200",
    title: "text-orange-950 dark:text-orange-100",
    icon: "text-orange-600 dark:text-orange-400",
    muted: "text-orange-900/70 dark:text-orange-200/70",
  },
  3: {
    border: "border-red-500/70 dark:border-red-500/60",
    cardBg: "bg-red-50 dark:bg-red-950/55",
    rowBg: "bg-red-100/80 dark:bg-red-950/35",
    badge: "bg-red-500/20 text-red-950 dark:bg-red-500/30 dark:text-red-100",
    title: "text-red-950 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
    muted: "text-red-900/70 dark:text-red-200/70",
  },
};

export function KnmiWarningsCard({ data }: KnmiWarningsCardProps) {
  if (data.maxLevel === 0 || data.warnings.length === 0) {
    return null;
  }

  const provinceLabel = KNMI_PROVINCE_LABELS[data.province] ?? data.province;
  const headerStyle = LEVEL_STYLES[data.maxLevel as 1 | 2 | 3] ?? LEVEL_STYLES[1];

  return (
    <Card
      className={cn(
        "border shadow-lg backdrop-blur-none",
        headerStyle.border,
        headerStyle.cardBg
      )}
    >
      <CardContent className="space-y-3">
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
              <p className={cn("mt-0.5 text-[0.65rem]", headerStyle.muted)}>
                Officiële waarschuwing · {provinceLabel}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
              headerStyle.badge
            )}
          >
            {data.maxLevelLabel}
          </span>
        </header>

        <ul className="space-y-2">
          {data.warnings.map((warning) => (
            <KnmiWarningRow key={warningKey(warning)} warning={warning} />
          ))}
        </ul>

        <p className={cn("text-[0.6rem]", headerStyle.muted)}>
          Bron: KNMI Data Platform · ververst ca. elk kwartier
        </p>
      </CardContent>
    </Card>
  );
}

function warningKey(w: KnmiWarningItem): string {
  return `${w.level}-${w.phenomenonId}-${w.validFrom}-${w.texts[0] ?? ""}`;
}

function KnmiWarningRow({ warning }: { warning: KnmiWarningItem }) {
  const style = LEVEL_STYLES[warning.level];

  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2.5",
        style.border,
        style.rowBg
      )}
    >
      <p className={cn("text-sm font-medium", style.title)}>{warning.phenomenonLabel}</p>
      <p className={cn("mt-0.5 text-[0.65rem]", style.muted)}>
        {warning.levelLabel}
        {warning.validFrom !== warning.validTo
          ? ` · ${warning.validFrom} – ${warning.validTo}`
          : ` · ${warning.validFrom}`}
      </p>
      {warning.texts.length > 0 ? (
        <details className="mt-1.5 group">
          <summary
            className={cn(
              "cursor-pointer text-[0.65rem] marker:content-none list-none [&::-webkit-details-marker]:hidden",
              style.muted
            )}
          >
            <span className="underline decoration-current/30 underline-offset-2 group-open:hidden">
              Toon toelichting
            </span>
            <span className="hidden underline decoration-current/30 underline-offset-2 group-open:inline">
              Verberg toelichting
            </span>
          </summary>
          <div className={cn("mt-1.5 space-y-1 text-[0.7rem] leading-relaxed", style.title)}>
            {warning.texts.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </details>
      ) : null}
    </li>
  );
}
