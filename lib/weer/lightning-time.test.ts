import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isRecentLightningStrike,
  parseLightningTime,
} from "./lightning-time";

describe("parseLightningTime", () => {
  it("interpreteert ms sinds UTC-middernacht", () => {
    const r = parseLightningTime("41476065", "2020-10-01 11:31:16");
    assert.ok(r);
    assert.equal(r.raw, 41476065);
    assert.match(r.isoAmsterdam, /13:31:1[56]/);
  });

  it("accepteert Unix seconden", () => {
    const r = parseLightningTime("1600000000", "2020-09-13 12:26:40");
    assert.ok(r);
    assert.match(r.isoAmsterdam, /2020-09-13/);
  });
});

describe("isRecentLightningStrike", () => {
  it("herkent recente inslag", () => {
    const now = Date.parse("2026-06-19T18:30:00");
    assert.equal(
      isRecentLightningStrike("2026-06-19 18:22:50", 45 * 60 * 1000, now),
      true
    );
  });

  it("wijst oude inslag af", () => {
    const now = Date.parse("2026-06-19T20:00:00");
    assert.equal(
      isRecentLightningStrike("2026-06-19 18:22:50", 45 * 60 * 1000, now),
      false
    );
  });
});
