import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasActiveKnmiThunderWarning } from "./thunder";
import type { KnmiWaarschuwingenApi, KnmiWarningItem } from "@/lib/api/types";

function warning(overrides: Partial<KnmiWarningItem>): KnmiWarningItem {
  return {
    level: 1,
    levelLabel: "Code geel",
    phenomenonId: "thunderstorm",
    phenomenonLabel: "Onweersbuien",
    validFrom: "29 mei 12:00",
    validTo: "29 mei 13:00",
    active: true,
    texts: [],
    ...overrides,
  };
}

function api(warnings: KnmiWarningItem[]): KnmiWaarschuwingenApi {
  return {
    province: "FR",
    maxLevel: 1,
    maxLevelLabel: "Code geel",
    warnings,
    sourceFile: null,
    updatedAt: "2026-05-29T12:00:00.000Z",
  };
}

describe("hasActiveKnmiThunderWarning", () => {
  it("true bij actieve onweerwaarschuwing", () => {
    assert.equal(hasActiveKnmiThunderWarning(api([warning({})])), true);
  });

  it("false bij niet-actieve onweerwaarschuwing", () => {
    assert.equal(
      hasActiveKnmiThunderWarning(api([warning({ active: false })])),
      false
    );
  });

  it("false bij ander fenomeen", () => {
    assert.equal(
      hasActiveKnmiThunderWarning(
        api([warning({ phenomenonId: "wind", phenomenonLabel: "Wind" })])
      ),
      false
    );
  });

  it("false bij ontbrekende data", () => {
    assert.equal(hasActiveKnmiThunderWarning(null), false);
    assert.equal(hasActiveKnmiThunderWarning(api([])), false);
  });
});
