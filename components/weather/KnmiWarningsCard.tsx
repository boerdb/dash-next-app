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
  { border: string; bg: string; badge: string; text: string; icon: string }
> = {
  1: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-950/40",
    badge: "bg-yellow-500/25 text-yellow-200",
    text: "text-yellow-100",
    icon: "text-yellow-400",
  },
  2: {
    border: "border-orange-500/50",
    bg: "bg-orange-950/40",
    badge: "bg-orange-500/25 text-orange-200",
    text: "text-orange-100",
    icon: "text-orange-400",
  },
  3: {
    border: "border-red-500/60",
    bg: "bg-red-950/45",
    badge: "bg-red-500/30 text-red-100",
    text: "text-red-100",
    icon: "text-red-400",
  },
};

export function KnmiWarningsCard({ data }: KnmiWarningsCardProps) {
  if (data.maxLevel === 0 || data.warnings.length === 0) {
    return null;
  }

  const provinceLabel = KNMI_PROVINCE_LABELS[data.province] ?? data.province;
  const headerStyle = LEVEL_STYLES[data.maxLevel as 1 | 2 | 3] ?? LEVEL_STYLES[1];

  return (
    <Card variant="weather" className={cn("border", headerStyle.border, headerStyle.bg)}>
      <CardContent className="space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle
              className={cn("mt-0.5 h-5 w-5 shrink-0", headerStyle.icon)}
              aria-hidden
            />
            <div>
              <p className={cn("text-sm font-semibold", headerStyle.text)}>
                KNMI · {data.maxLevelLabel}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-zinc-300">
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

        <p className="text-[0.6rem] text-zinc-300">
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
        "border-white/5 bg-black/20"
      )}
    >
      <p className={cn("text-sm font-medium", style.text)}>{warning.phenomenonLabel}</p>
      <p className="mt-0.5 text-[0.65rem] text-zinc-300">
        {warning.levelLabel}
        {warning.validFrom !== warning.validTo
          ? ` · ${warning.validFrom} – ${warning.validTo}`
          : ` · ${warning.validFrom}`}
      </p>
      {warning.texts.length > 0 ? (
        <details className="mt-1.5 group">
          <summary className="cursor-pointer text-[0.65rem] text-zinc-300 marker:content-none list-none [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-white/20 underline-offset-2 group-open:hidden">
              Toon toelichting
            </span>
            <span className="hidden underline decoration-white/20 underline-offset-2 group-open:inline">
              Verberg toelichting
            </span>
          </summary>
          <div className="mt-1.5 space-y-1 text-[0.7rem] leading-relaxed text-zinc-200">
            {warning.texts.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </details>
      ) : null}
    </li>
  );
}
