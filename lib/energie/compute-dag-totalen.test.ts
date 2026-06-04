import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDagTotalenKwh } from "./compute-dag-totalen";
import type { BatterijLive } from "@/lib/homewizard/battery";

describe("computeDagTotalenKwh", () => {
  it("berekent net en batterij voor een dag", () => {
    const start = {
      date: "2026-06-03",
      import_start: 1000,
      export_start: 200,
      gas_start: 0,
      water_start: 0,
      batterijen: { "179": { import_start: 50, export_start: 10 } },
    };
    const data = {
      total_power_import_kwh: 1005.5,
      total_power_export_kwh: 203.2,
    };
    const bat: BatterijLive[] = [
      {
        id: "179",
        label: ".179",
        soc: 80,
        vermogen_w: 0,
        bereikbaar: true,
        import_start: 52,
        export_start: 14,
      },
    ];
    const t = computeDagTotalenKwh(start, data, bat);
    assert.equal(t.net_in_kwh, 5.5);
    assert.equal(t.net_uit_kwh, 3.2);
    assert.equal(t.batterij_kwh, 4);
  });
});
