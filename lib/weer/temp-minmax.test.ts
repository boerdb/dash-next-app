import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeVandaagTempMinMax } from "./temp-minmax";

describe("mergeVandaagTempMinMax", () => {
  it("gebruikt metingen min/max en negeert live spike", () => {
    const r = mergeVandaagTempMinMax(
      { temp_c: 25, date_tracked: "2026-06-06" },
      { min: 12.3, max: 21.3 }
    );
    assert.equal(r.temp_min_c, 12.3);
    assert.equal(r.temp_max_c, 21.3);
  });

  it("neemt min/max-tijden mee uit metingen", () => {
    const r = mergeVandaagTempMinMax(
      { temp_c: 25, date_tracked: "2026-06-06" },
      { min: 12.3, max: 21.3, minAt: "05:40", maxAt: "15:10" }
    );
    assert.equal(r.temp_min_time, "05:40");
    assert.equal(r.temp_max_time, "15:10");
  });

  it("valt terug op live temp zonder metingen", () => {
    const r = mergeVandaagTempMinMax(
      { temp_c: 18.5, date_tracked: "2026-06-06" },
      { min: null, max: null }
    );
    assert.equal(r.temp_min_c, 18.5);
    assert.equal(r.temp_max_c, 18.5);
  });
});
