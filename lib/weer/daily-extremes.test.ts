import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDailyExtremes } from "./daily-extremes";

const NOON = new Date("2026-07-04T12:00:00+02:00");

describe("applyDailyExtremes", () => {
  it("zet eerste windmax en tijd", () => {
    const r = applyDailyExtremes({ windspeed_kmh: 5.2 }, null, NOON);
    assert.equal(r.maxdailywind_kmh, 5.2);
    assert.ok(r.maxdailywind_time);
  });

  it("bijwerkt vocht min/max met tijd bij nieuwe piek", () => {
    const prev = {
      date_tracked: "2026-07-04",
      humidity: 70,
      humidity_min: 70,
      humidity_max: 70,
      humidity_min_time: "08:00",
      humidity_max_time: "08:00",
    };
    const r = applyDailyExtremes({ humidity: 83 }, prev, NOON);
    assert.equal(r.humidity_max, 83);
    assert.notEqual(r.humidity_max_time, "08:00");
    assert.equal(r.humidity_min, 70);
    assert.equal(r.humidity_min_time, "08:00");
  });
});
