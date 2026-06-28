import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyMaxGustTime } from "./max-gust-time";

const NOON = new Date("2026-06-28T10:00:00Z");

describe("applyMaxGustTime", () => {
  it("zet tijd bij eerste gust-waarde", () => {
    const r = applyMaxGustTime({ maxdailygust_kmh: 18 }, null, NOON);
    assert.ok(r.maxdailygust_time);
  });

  it("vernieuwt tijd bij een hogere piek", () => {
    const prev = { maxdailygust_kmh: 18, maxdailygust_time: "08:00" };
    const r = applyMaxGustTime({ maxdailygust_kmh: 25 }, prev, NOON);
    assert.notEqual(r.maxdailygust_time, "08:00");
  });

  it("behoudt tijd als de daggust gelijk blijft", () => {
    const prev = { maxdailygust_kmh: 25, maxdailygust_time: "08:00" };
    const r = applyMaxGustTime({ maxdailygust_kmh: 25 }, prev, NOON);
    assert.equal(r.maxdailygust_time, "08:00");
  });

  it("vernieuwt tijd bij dag-reset (lagere waarde)", () => {
    const prev = { maxdailygust_kmh: 40, maxdailygust_time: "23:50" };
    const r = applyMaxGustTime({ maxdailygust_kmh: 5 }, prev, NOON);
    assert.notEqual(r.maxdailygust_time, "23:50");
  });

  it("behoudt bestaande tijd zonder gust-waarde", () => {
    const prev = { maxdailygust_time: "08:00" };
    const r = applyMaxGustTime({ temp_c: 20 }, prev, NOON);
    assert.equal(r.maxdailygust_time, "08:00");
  });
});
