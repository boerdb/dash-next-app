import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeHeatIndexC, heatIndexFahrenheit } from "./heat-index";

describe("heatIndexFahrenheit", () => {
  it("32 °C + 70 % ≈ 41 °C hitte-index", () => {
    const hiF = heatIndexFahrenheit(89.6, 70);
    const hiC = ((hiF - 32) * 5) / 9;
    assert.ok(hiC > 38 && hiC < 44);
  });
});

describe("computeHeatIndexC", () => {
  it("null onder 27 °C", () => {
    assert.equal(computeHeatIndexC(20, 80), null);
  });

  it("stijgt boven temperatuur bij warm en vochtig", () => {
    const hi = computeHeatIndexC(32, 70);
    assert.ok(hi != null && hi > 32);
  });
});
