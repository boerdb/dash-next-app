"use client";

import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { Section } from "@/components/ui/section";
import { HueStatusCard } from "@/components/hue/HueStatusCard";
import { HueLightsCard } from "@/components/hue/HueLightsCard";
import { HueRulesCard, HueEvaluateButton } from "@/components/hue/HueRulesCard";
import { HueLogCard } from "@/components/hue/HueLogCard";
import { refreshAllHue } from "@/lib/hooks/use-hue";

export default function HuePage() {
  return (
    <PullToRefresh onRefresh={refreshAllHue}>
      <div className="space-y-[var(--space-section)] pb-2">
        <Section title="Lampen" subtitle="Aan, uit en dimmen" accent="amber">
          <HueLightsCard />
        </Section>

        <Section title="Automatisering" subtitle="Weer-gedreven regels" accent="amber">
          <div className="mb-3">
            <HueEvaluateButton />
          </div>
          <HueRulesCard />
        </Section>

        <Section title="Geschiedenis" subtitle="Uitgevoerde acties" accent="amber">
          <HueLogCard />
        </Section>

        <Section
          title="Verbinding"
          subtitle="Bridge-IP en koppeling · alleen bij setup"
          accent="amber"
          collapsible
          defaultOpen={false}
        >
          <HueStatusCard />
        </Section>
      </div>
    </PullToRefresh>
  );
}
