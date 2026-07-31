import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAmsterdamDateTime } from "@/lib/db/nl-time";
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
  it("herkent recente inslag (Amsterdam wall clock)", () => {
    const strikeMs = parseAmsterdamDateTime("2026-06-19 18:22:50")!;
    const now = strikeMs + 7 * 60_000;
    assert.equal(
      isRecentLightningStrike("2026-06-19 18:22:50", 45 * 60 * 1000, now),
      true
    );
  });

  it("wijst oude inslag af (Amsterdam wall clock)", () => {
    const strikeMs = parseAmsterdamDateTime("2026-06-19 18:22:50")!;
    const now = strikeMs + 98 * 60_000;
    assert.equal(
      isRecentLightningStrike("2026-06-19 18:22:50", 45 * 60 * 1000, now),
      false
    );
  });

  it("wijst inslag na 2u45 af (geen vals-recente verlenging op UTC-server)", () => {
    const now = parseAmsterdamDateTime("2026-07-31 09:42:00")!;
    assert.equal(
      isRecentLightningStrike("2026-07-31 06:57:50", 45 * 60 * 1000, now),
      false
    );
  });
});
