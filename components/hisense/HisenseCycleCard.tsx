"use client";

import { Badge } from "@/components/ui/badge";
import { Metric, MetricRow } from "@/components/ui/metric";
import { StatusPanel } from "@/components/ui/status-panel";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { useHisenseStatus } from "@/lib/hooks/use-hisense";
import type { HisenseCycle, HisenseCycleMode, HisenseRunState } from "@/lib/hisense/types";

const STATE_LABEL: Record<HisenseRunState, string> = {
  offline: "Offline",
  off: "Uit",
  standby: "Stand-by",
  delayed: "Uitgesteld",
  running: "Bezig",
  paused: "Pauze",
  finished: "Klaar",
  error: "Storing",
};

const MODE_LABEL: Record<HisenseCycleMode, string> = {
  wash: "Wassen",
  dry: "Drogen",
  wash_dry: "Wassen + drogen",
};

function dash(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—";
}

function remainingLabel(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} u ${m} min`;
}

function updatedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const time = new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  return `Bijgewerkt: ${time}`;
}

function cycleFields(cycle: HisenseCycle | null) {
  return {
    temperature: dash(cycle?.temperature),
    spin: cycle?.spinRpm != null ? `${cycle.spinRpm} tpm` : "—",
    state: cycle ? STATE_LABEL[cycle.state] : "—",
    program: dash(cycle?.program),
    phase: dash(cycle?.phase),
    mode: cycle?.mode ? MODE_LABEL[cycle.mode] : "—",
    remaining: remainingLabel(cycle?.remainingMinutes ?? null),
    door:
      cycle?.door === "open"
        ? "Open"
        : cycle?.door === "closed"
          ? "Dicht"
          : cycle?.door === "locked"
            ? "Vergrendeld"
            : "—",
  };
}

export function HisenseCycleCard() {
  const { status, error, isLoading, mutate } = useHisenseStatus();

  if (error && !status) {
    return <StatusPanel message={error.message} onRetry={() => void mutate()} />;
  }

  const linked = status?.linked ?? false;
  const cycle = status?.cycle ?? null;
  const fields = cycleFields(cycle);
  const updated = updatedLabel(status?.updatedAt);

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={linked ? "teal" : "default"}>
              {linked ? "Gekoppeld" : "Niet gekoppeld"}
            </Badge>
            {cycle?.state === "offline" ? <Badge variant="default">Offline</Badge> : null}
            {cycle?.errorCode ? (
              <Badge variant="danger">Storing {cycle.errorCode}</Badge>
            ) : null}
          </div>
          {isLoading && !status ? (
            <span className="text-caption text-surface-muted">Laden…</span>
          ) : updated ? (
            <span className="text-caption text-surface-muted">{updated}</span>
          ) : null}
        </div>

        <MetricRow className="sm:grid-cols-3">
          <Metric label="Status" value={fields.state} size="sm" />
          <Metric label="Programma" value={fields.program} size="sm" />
          <Metric label="Fase" value={fields.phase} size="sm" />
          <Metric label="Modus" value={fields.mode} size="sm" />
          <Metric label="Resttijd" value={fields.remaining} size="sm" />
          <Metric label="Deur" value={fields.door} size="sm" />
          <Metric label="Temperatuur" value={fields.temperature} size="sm" />
          <Metric label="Centrifuge" value={fields.spin} size="sm" />
        </MetricRow>

        {status?.notice ? (
          <p className="text-caption text-surface-muted">{status.notice}</p>
        ) : null}
      </SurfaceBody>
    </Surface>
  );
}
