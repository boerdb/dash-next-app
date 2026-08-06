import type { RuleAction } from "@/lib/tahoma/types";

export const ACTIONS: { value: RuleAction; label: string; needsPosition: boolean }[] = [
  { value: "close", label: "Sluiten", needsPosition: false },
  { value: "open", label: "Openen", needsPosition: false },
  { value: "stop", label: "Stop", needsPosition: false },
  { value: "setClosure", label: "Zet stand (%)", needsPosition: true },
  { value: "setOrientation", label: "Zet orientatie (°)", needsPosition: true },
];
