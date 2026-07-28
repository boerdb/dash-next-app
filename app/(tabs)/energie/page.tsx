"use client";

import dynamic from "next/dynamic";
import { BatteryPanel } from "@/components/energy/BatteryPanel";
import { PhasePanel } from "@/components/energy/PhasePanel";
import { PowerHero } from "@/components/energy/PowerHero";
import { DailyStats } from "@/components/energy/DailyStats";
import { EnergyFlow } from "@/components/energy/EnergyFlow";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { StatusPanel } from "@/components/ui/status-panel";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnergieData } from "@/lib/hooks/use-energie";

const PowerChart = dynamic(
  () =>
    import("@/components/energy/PowerChart").then((m) => m.PowerChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> }
);

const BatteryChart = dynamic(
  () =>
    import("@/components/energy/BatteryChart").then((m) => m.BatteryChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> }
);

const MonthlyEnergyChart = dynamic(
  () =>
    import("@/components/energy/MonthlyEnergyChart").then(
      (m) => m.MonthlyEnergyChart
    ),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> }
);

export default function EnergiePage() {
  const {
    energie,
    energieError,
    isLoading,
    chartHistorie,
    showBatteries,
    refreshAll,
    mutateEnergie,
  } = useEnergieData();

  const showSkeleton = isLoading && !energie && !energieError;

  return (
    <PullToRefresh onRefresh={refreshAll}>
      {showSkeleton ? (
        <EnergieSkeleton />
      ) : energieError && !energie ? (
        <StatusPanel message={energieError.message} onRetry={() => mutateEnergie()} />
      ) : energie ? (
        <div className="space-y-[var(--space-section)] pb-2">
          <PowerHero data={energie} />

          <EnergyFlow data={energie} />

          {energie.fases ? (
            <Section title="Fasen" subtitle="P1-meter · live per fase" accent="energy">
              <PhasePanel data={energie} />
            </Section>
          ) : null}

          <div className="grid gap-[var(--space-section)] lg:grid-cols-2">
            <Section title="Vandaag" subtitle="Stroom · gas · water" accent="energy">
              <DailyStats data={energie} />
            </Section>

            {showBatteries ? (
              <Section title="Batterijen" subtitle="HomeWizard · laadstrategie" accent="violet">
                <BatteryPanel data={energie} />
                <BatteryChart data={energie} />
              </Section>
            ) : null}
          </div>

          <Section
            title="Historie"
            subtitle="Grafieken en maandoverzicht"
            collapsible
            defaultOpen={false}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {chartHistorie?.labels?.length ? <PowerChart data={chartHistorie} /> : null}
              <MonthlyEnergyChart />
            </div>
          </Section>
        </div>
      ) : (
        <StatusPanel onRetry={() => mutateEnergie()} />
      )}
    </PullToRefresh>
  );
}

function EnergieSkeleton() {
  return (
    <div className="space-y-[var(--space-section)]">
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
