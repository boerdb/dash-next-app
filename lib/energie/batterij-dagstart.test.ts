import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBatteryDagstartTotals,
  buildBatteryHistorieFromDagstart,
  mergeDagstartBatteries,
  updateBatteryHourlySample,
} from "./batterij-dagstart";
import type { BatterijLive } from "@/lib/homewizard/battery";

describe("batterij dagstart", () => {
  it("berekent vandaag laden/ontladen", () => {
    const bat: BatterijLive[] = [
      {
        id: "179",
        label: ".179",
        soc: 90,
        vermogen_w: 0,
        bereikbaar: true,
        import_start: 110,
        export_start: 40,
      },
    ];
    const out = applyBatteryDagstartTotals(bat, {
      date: "2026-06-04",
      import_start: 0,
      export_start: 0,
      gas_start: 0,
      water_start: 0,
      batterijen: { "179": { import_start: 100, export_start: 30 } },
    });
    assert.equal(out[0]?.vandaag_laden_kwh, 10);
    assert.equal(out[0]?.vandaag_ontladen_kwh, 10);
  });

  it("bouwt historie uit uur-samples", () => {
    const h = buildBatteryHistorieFromDagstart(
      {
        date: "2026-06-04",
        import_start: 0,
        export_start: 0,
        gas_start: 0,
        water_start: 0,
        batterij_uur: { "2026-06-04 14": 500, "2026-06-04 15": 200 },
      },
      100
    );
    assert.equal(h.labels.length, 2);
    assert.equal(h.wattage[1], 100);
  });

  it("beperkt uur-samples tot 24", () => {
    const uur: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      uur[`2026-06-01 ${String(i).padStart(2, "0")}`] = i;
    }
    const start = updateBatteryHourlySample(
      {
        date: "2026-06-04",
        import_start: 0,
        export_start: 0,
        gas_start: 0,
        water_start: 0,
        batterij_uur: uur,
      },
      100
    );
    assert.ok(Object.keys(start.batterij_uur ?? {}).length <= 24);
  });

  it("overschrijft batterij-dagstart niet bij elke poll", () => {
    const bat: BatterijLive[] = [
      {
        id: "170",
        label: ".170",
        soc: 60,
        vermogen_w: -280,
        bereikbaar: true,
        import_start: 400.6,
        export_start: 289.5,
      },
    ];
    const start = {
      date: "2026-06-05",
      import_start: 0,
      export_start: 0,
      gas_start: 0,
      water_start: 0,
      batterijen: { "170": { import_start: 400.571, export_start: 288.676 } },
    };
    const merged = mergeDagstartBatteries(start, bat);
    assert.equal(merged.batterijen?.["170"]?.export_start, 288.676);
    const out = applyBatteryDagstartTotals(bat, merged);
    assert.equal(out[0]?.vandaag_ontladen_kwh, 0.82);
  });
});
