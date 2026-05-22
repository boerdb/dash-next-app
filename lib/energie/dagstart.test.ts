import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyDagstartTotals, buildDagstartFromMeters } from "./dagstart";

describe("energie dagstart", () => {
  it("berekent vandaag-totalen", () => {
    const start = buildDagstartFromMeters({
      total_power_import_kwh: 100,
      total_power_export_kwh: 10,
      total_gas_m3: 5,
      total_liter_m3: 10,
    });
    const out = applyDagstartTotals(
      {
        total_power_import_kwh: 105,
        total_power_export_kwh: 12,
        total_gas_m3: 5.5,
        total_liter_m3: 10.1,
        active_power_w: -500,
      },
      start
    );
    assert.equal(out.vandaag_stroom_in_kwh, 5);
    assert.equal(out.vandaag_stroom_out_kwh, 2);
    assert.equal(out.vandaag_gas_m3, 0.5);
    assert.equal(out.vandaag_water_l, 100);
  });
});
