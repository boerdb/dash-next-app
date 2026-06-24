import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeDailyMinMax, parseEcowittPayload } from "./ecowitt-ingest";

describe("parseEcowittPayload", () => {
  it("converteert Fahrenheit en inches", () => {
    const r = parseEcowittPayload({
      tempf: "71.2",
      temp2f: "75.6",
      humidity: "71",
      humidity2: "66",
      windspeedmph: "1.1",
      windspdmph_avg10m: "1.3",
      dailyrainin: "0",
      maxdailygust: "4.5",
      wh65batt: "0",
      wh25batt: "0",
    });
    assert.equal(r.temp_c, 21.8);
    assert.equal(r.temp2_c, 24.2);
    assert.equal(r.humidity2, 66);
    assert.equal(r.windspd_avg10m_kmh, 2.1);
    assert.equal(r.maxdailygust_kmh, 7.2);
    assert.ok(r.server_timestamp);
  });

  it("mapt bliksem en WS90 piezo", () => {
    const r = parseEcowittPayload({
      dateutc: "2020-10-01 11:31:16",
      lightning: "7",
      lightning_num: "3",
      lightning_time: "41476065",
      wh57batt: "5",
      drain_piezo: "0.12",
      rrain_piezo: "0.01",
      wh90batt: "150",
      ws90cap_volt: "200",
    });
    assert.equal(r.lightning_km, 7);
    assert.equal(r.lightning_num, 3);
    assert.ok(r.lightning_time);
    assert.equal(r.dailyrain_piezo_mm, 3);
    assert.equal(r.rainrate_piezo_mm, 0.3);
    assert.equal(r.ws90_voltage_v, 3);
    assert.equal(r.ws90_cap_voltage_v, 4);
  });

  it("accepteert WH90-spanning al in volt (HP2550)", () => {
    const r = parseEcowittPayload({
      wh90batt: "3.18",
      ws90cap_volt: "1.8",
    });
    assert.equal(r.ws90_voltage_v, 3.18);
    assert.equal(r.ws90_cap_voltage_v, 1.8);
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
