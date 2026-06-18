import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateBatterijen,
  batteryIdFromUrl,
  buildBatteryEndpoints,
  formatBatterijMode,
  isBatterijStandby,
  isBatterijZeroMode,
  mapBatteryV2,
  mapP1BatteriesGroep,
  normalizeBatteryEndpoint,
  parseBatteryUrls,
  parseSoc,
} from "./battery";

describe("homewizard battery", () => {
  it("normaliseert v1-URL naar v2 measurement", () => {
    const n = normalizeBatteryEndpoint("http://192.168.1.179/api/v1/data");
    assert.equal(n.v2Url, "https://192.168.1.179/api/measurement");
  });

  it("mapt v2 measurement met extra velden", () => {
    const b = mapBatteryV2(
      {
        power_w: -400,
        state_of_charge_pct: 72,
        voltage_v: 230.5,
        cycles: 12,
        energy_import_kwh: 100,
        energy_export_kwh: 50,
      },
      "179",
      "Garage"
    );
    assert.equal(b.label, "Garage");
    assert.equal(b.soc, 72);
    assert.equal(b.voltage_v, 230.5);
    assert.equal(b.cycles, 12);
    assert.equal(b.import_start, 100);
  });

  it("mapt P1 batterijgroep", () => {
    const g = mapP1BatteriesGroep({
      mode: "zero",
      battery_count: 2,
      power_w: 800,
      target_power_w: 750,
      max_consumption_w: 1600,
      max_production_w: 800,
      permissions: ["charge_allowed", "discharge_allowed"],
    });
    assert.equal(g?.mode_label, "Nul op de meter");
    assert.equal(g?.target_power_w, 750);
  });

  it("formatBatterijMode", () => {
    assert.equal(formatBatterijMode("zero"), "Nul op de meter");
    assert.equal(
      formatBatterijMode("predictive", { laadstrategie: "dynamic_hourly" }),
      "Slim met dynamisch tarief · Per uur"
    );
    assert.equal(
      formatBatterijMode("predictive", { laadstrategie: "grid_friendly" }),
      "Slim en wijkvriendelijk"
    );
    assert.equal(
      formatBatterijMode("to_full", { charge_to_full: true }),
      "Eenmalig volladen"
    );
  });

  it("herkent zero- en standby-modus", () => {
    const zero = mapP1BatteriesGroep({
      mode: "zero",
      battery_count: 2,
      permissions: ["charge_allowed", "discharge_allowed"],
    });
    assert.ok(zero && isBatterijZeroMode(zero));
    assert.ok(!isBatterijStandby(zero));

    const standby = mapP1BatteriesGroep({
      mode: "standby",
      battery_count: 2,
      permissions: [],
    });
    assert.ok(standby && isBatterijStandby(standby));
  });

  it("bouwt endpoints met labels", () => {
    const eps = buildBatteryEndpoints(
      ["https://192.168.1.179"],
      ["tok"],
      ["Bijkeuken"]
    );
    assert.equal(eps[0]?.label, "Bijkeuken");
  });
});
