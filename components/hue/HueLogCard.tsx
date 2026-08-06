"use client";

import { Trash2 } from "lucide-react";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHueLog } from "@/lib/hooks/use-hue";
import { METRIC_BY_KEY, operatorLabel } from "@/lib/tahoma/metrics";
import { HUE_ACTIONS } from "@/components/hue/HueRulesCard.helpers";
import { colorLabel } from "@/lib/hue/colors";

export function HueLogCard() {
  const { entries, mutate } = useHueLog();

  const clear = async () => {
    await fetch("/api/hue/log", { method: "DELETE" });
    await mutate();
  };

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Actiegeschiedenis</h3>
            <p className="text-caption mt-0.5 text-surface-muted">Laatste {entries.length} acties</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clear} disabled={entries.length === 0}>
            <Trash2 className="h-4 w-4" />
            Wissen
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-caption text-surface-muted">Nog geen acties uitgevoerd.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {entries.map((e) => {
              const metric = e.trigger ? METRIC_BY_KEY[e.trigger.metric] : null;
              const actionLabel = HUE_ACTIONS.find((a) => a.value === e.action)?.label ?? e.action;
              return (
                <li key={e.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{e.lightName}</span>{" "}
                        <span className="text-surface-muted">→ {actionLabel}</span>
                        {e.brightness != null && e.action !== "off"
                          ? ` (${e.brightness}%)`
                          : ""}
                        {e.color && e.action !== "off"
                          ? ` · ${colorLabel(e.color)}`
                          : ""}
                      </p>
                      <p className="text-caption mt-0.5 text-surface-muted">
                        {e.ruleName ? `${e.ruleName} · ` : ""}
                        {new Date(e.at).toLocaleString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                        {metric && e.trigger
                          ? ` · ${metric.label} ${operatorLabel(e.trigger.operator)} ${e.trigger.threshold} (was ${e.trigger.value})`
                          : ""}
                      </p>
                      {e.message ? (
                        <p className="text-caption mt-0.5 text-accent-danger">{e.message}</p>
                      ) : null}
                    </div>
                    <Badge variant={e.status === "ok" ? "export" : "danger"}>
                      {e.status === "ok" ? "ok" : "fout"}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceBody>
    </Surface>
  );
}
