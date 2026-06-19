import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectSensorBatteries, formatEcowittBattery } from "./sensor-battery";

describe("formatEcowittBattery", () => {
  it("flag: 0 ok, 1 laag", () => {
    assert.equal(formatEcowittBattery("0", "flag", "WH65")?.state, "ok");
    assert.equal(formatEcowittBattery("1", "flag", "WH65")?.state, "low");
  });

  it("bars: wh57 schaal", () => {
    assert.equal(formatEcowittBattery("4", "bars", "WH57")?.detail, "4/5");
    assert.equal(formatEcowittBattery("1", "bars", "WH57")?.state, "low");
  });

  it("voltage: wh90 × 0,02 V", () => {
    assert.equal(formatEcowittBattery("150", "voltage", "WS90")?.detail, "3 V");
  });
});

describe("collectSensorBatteries", () => {
  it("verzamelt aanwezige velden", () => {
    const list = collectSensorBatteries({ wh65batt: "0", wh25batt: "0" });
    assert.equal(list.length, 2);
    assert.equal(list[0]?.label, "Hoofdsensor");
  });
});
