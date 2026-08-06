"use client";

import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { Section } from "@/components/ui/section";
import { TahomaStatusCard } from "@/components/tahoma/TahomaStatusCard";
import { TahomaDevicesCard } from "@/components/tahoma/TahomaDevicesCard";
import {
  TahomaRulesCard,
  TahomaEvaluateButton,
} from "@/components/tahoma/TahomaRulesCard";
import { TahomaLogCard } from "@/components/tahoma/TahomaLogCard";
import { refreshAllTahoma } from "@/lib/hooks/use-tahoma";

export default function TahomaPage() {
  return (
    <PullToRefresh onRefresh={refreshAllTahoma}>
      <div className="space-y-[var(--space-section)] pb-2">
        <Section
          title="Apparaten"
          subtitle="Schermen, rolluiken, zonwering"
          accent="violet"
        >
          <TahomaDevicesCard />
        </Section>

        <Section
          title="Automatisering"
          subtitle="Weer-gedreven regels"
          accent="violet"
        >
          <div className="mb-3">
            <TahomaEvaluateButton />
          </div>
          <TahomaRulesCard />
        </Section>

        <Section title="Geschiedenis" subtitle="Uitgevoerde acties" accent="violet">
          <TahomaLogCard />
        </Section>

        <Section
          title="Verbinding"
          subtitle="Tahoma-box en token · alleen bij setup"
          accent="violet"
          collapsible
          defaultOpen={false}
        >
          <TahomaStatusCard />
        </Section>
      </div>
    </PullToRefresh>
  );
}
