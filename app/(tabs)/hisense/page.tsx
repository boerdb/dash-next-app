"use client";

import { HisenseCycleCard } from "@/components/hisense/HisenseCycleCard";
import { HisenseLinkCard } from "@/components/hisense/HisenseLinkCard";
import { HisenseMachineCard } from "@/components/hisense/HisenseMachineCard";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { Section } from "@/components/ui/section";
import { refreshHisense, useHisenseStatus } from "@/lib/hooks/use-hisense";

export default function HisensePage() {
  const { status } = useHisenseStatus();
  const linkSubtitle = status?.linked
    ? `ConnectLife · ${status.cycle?.state === "offline" ? "machine offline" : "gekoppeld"}`
    : "ConnectLife · nog niet aangesloten";

  return (
    <PullToRefresh onRefresh={refreshHisense}>
      <div className="space-y-[var(--space-section)] pb-2">
        <Section title="Cyclus" subtitle="Programma, fase en resttijd" accent="teal">
          <HisenseCycleCard />
        </Section>

        <Section title="Machine" subtitle="WD5I1245BBRH/BLX" accent="teal">
          <HisenseMachineCard />
        </Section>

        <Section
          title="Koppeling"
          subtitle={linkSubtitle}
          accent="teal"
          collapsible
          defaultOpen={!status?.linked}
        >
          <HisenseLinkCard />
        </Section>
      </div>
    </PullToRefresh>
  );
}
