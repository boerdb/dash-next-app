import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeDailyMinMax, parseEcowittPayload } from "./ecowitt-ingest";

describe("parseEcowittPayload", () => {
  it("converteert Fahrenheit en inches", () => {
    const r = parseEcowittPayload({
      tempf: "71.2",
      temp2f: "75.6",
      humidity: "71",
      windspeedmph: "1.1",
      windspdmph_avg10m: "1.3",
      dailyrainin: "0",
    });
    assert.equal(r.temp_c, 24.2);
    assert.equal(r.windspd_avg10m_kmh, 2.1);
    assert.ok(r.server_timestamp);
  });
});

describe("mergeDailyMinMax", () => {
  it("behoudt min/max binnen dezelfde dag", () => {
    const r = mergeDailyMinMax(
      { temp_c: 20, date_tracked: "2026-05-22" },
      { temp_c: 15, date_tracked: "2026-05-22", temp_min_c: 12, temp_max_c: 22 }
    );
    assert.equal(r.temp_min_c, 12);
    assert.equal(r.temp_max_c, 22);
  });
});
