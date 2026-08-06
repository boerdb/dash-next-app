"use client";

import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { Section } from "@/components/ui/section";
import { HueStatusCard } from "@/components/hue/HueStatusCard";
import { HueLightsCard } from "@/components/hue/HueLightsCard";
import { refreshAllHue } from "@/lib/hooks/use-hue";

export default function HuePage() {
  return (
    <PullToRefresh onRefresh={refreshAllHue}>
      <div className="space-y-[var(--space-section)] pb-2">
        <Section title="Verbinding" subtitle="Philips Hue Bridge · lokaal" accent="amber">
          <HueStatusCard />
        </Section>

        <Section title="Lampen" subtitle="Aan, uit en dimmen" accent="amber">
          <HueLightsCard />
        </Section>
      </div>
    </PullToRefresh>
  );
}
