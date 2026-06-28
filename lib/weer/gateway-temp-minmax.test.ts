import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyGatewayTempMinMax } from "./gateway-temp-minmax";

const MORNING = new Date("2026-06-29T05:00:00Z");
const AFTERNOON = new Date("2026-06-29T14:00:00Z");
const DAY = "2026-06-29";

describe("applyGatewayTempMinMax", () => {
  it("zet min/max bij eerste meting vandaag", () => {
    const r = applyGatewayTempMinMax(
      { temp_c: 18.5, date_tracked: DAY },
      null,
      MORNING
    );
    assert.equal(r.temp_min_c, 18.5);
    assert.equal(r.temp_max_c, 18.5);
    assert.ok(r.temp_min_time);
    assert.equal(r.temp_min_time, r.temp_max_time);
  });

  it("verlaagt min en behoudt max-tijd", () => {
    const prev = {
      temp_c: 20,
      date_tracked: DAY,
      temp_min_c: 20,
      temp_max_c: 22,
      temp_min_time: "08:00",
      temp_max_time: "14:00",
    };
    const r = applyGatewayTempMinMax(
      { temp_c: 15.2, date_tracked: DAY },
      prev,
      AFTERNOON
    );
    assert.equal(r.temp_min_c, 15.2);
    assert.equal(r.temp_max_c, 22);
    assert.notEqual(r.temp_min_time, "08:00");
    assert.equal(r.temp_max_time, "14:00");
  });

  it("verhoogt max en behoudt min-tijd", () => {
    const prev = {
      date_tracked: DAY,
      temp_min_c: 12,
      temp_max_c: 20,
      temp_min_time: "05:40",
      temp_max_time: "12:00",
    };
    const r = applyGatewayTempMinMax(
      { temp_c: 23.1, date_tracked: DAY },
      prev,
      AFTERNOON
    );
    assert.equal(r.temp_min_c, 12);
    assert.equal(r.temp_max_c, 23.1);
    assert.equal(r.temp_min_time, "05:40");
    assert.notEqual(r.temp_max_time, "12:00");
  });

  it("bevriest min/max-tijd bij gelijke waarden", () => {
    const prev = {
      date_tracked: DAY,
      temp_min_c: 12,
      temp_max_c: 22,
      temp_min_time: "05:40",
      temp_max_time: "15:10",
    };
    const r = applyGatewayTempMinMax(
      { temp_c: 18, date_tracked: DAY },
      prev,
      AFTERNOON
    );
    assert.equal(r.temp_min_c, 12);
    assert.equal(r.temp_max_c, 22);
    assert.equal(r.temp_min_time, "05:40");
    assert.equal(r.temp_max_time, "15:10");
  });

  it("reset bij nieuwe dag", () => {
    const prev = {
      date_tracked: "2026-06-28",
      temp_min_c: 10,
      temp_max_c: 25,
      temp_min_time: "05:00",
      temp_max_time: "16:00",
    };
    const r = applyGatewayTempMinMax(
      { temp_c: 17, date_tracked: DAY },
      prev,
      MORNING
    );
    assert.equal(r.temp_min_c, 17);
    assert.equal(r.temp_max_c, 17);
  });

  it("behoudt min/max zonder temp in update", () => {
    const prev = {
      date_tracked: DAY,
      temp_min_c: 12,
      temp_max_c: 22,
      temp_min_time: "05:40",
      temp_max_time: "15:10",
    };
    const r = applyGatewayTempMinMax({ winddir: 180, date_tracked: DAY }, prev, AFTERNOON);
    assert.equal(r.temp_min_c, 12);
    assert.equal(r.temp_max_c, 22);
    assert.equal(r.temp_min_time, "05:40");
  });
});
