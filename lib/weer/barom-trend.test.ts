import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeBaromTrend,
  formatBaromTrendDelta,
} from "./barom-trend";

describe("computeBaromTrend", () => {
  it("detecteert stijgende druk", () => {
    const t = computeBaromTrend(1020, 1018);
    assert.equal(t?.direction, "up");
    assert.equal(t?.delta_hpa, 2);
    assert.equal(t?.label, "Stijgend");
  });

  it("detecteert dalende druk", () => {
    const t = computeBaromTrend(1015, 1018);
    assert.equal(t?.direction, "down");
    assert.equal(t?.delta_hpa, -3);
  });

  it("is stabiel bij kleine verandering", () => {
    const t = computeBaromTrend(1018.2, 1018);
    assert.equal(t?.direction, "steady");
    assert.equal(t?.label, "Stabiel");
  });
});

describe("formatBaromTrendDelta", () => {
  it("toont teken", () => {
    assert.equal(formatBaromTrendDelta(1.2), "+1.2");
    assert.equal(formatBaromTrendDelta(-0.8), "-0.8");
  });
});
