import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faseCount, mapP1Phases } from "./p1-phases";

describe("mapP1Phases", () => {
  it("mapt v1 veldnamen", () => {
    const fases = mapP1Phases({
      active_power_l1_w: -110,
      active_power_l2_w: 663,
      active_power_l3_w: -228,
      active_voltage_l1_v: 223.1,
      active_voltage_l2_v: 223.4,
      active_voltage_l3_v: 232.2,
      active_current_l1_a: -1.04,
      active_current_l2_a: 3.81,
      active_current_l3_a: -1.3,
    });
    assert.ok(fases);
    assert.equal(fases!.l1!.vermogen_w, -110);
    assert.equal(fases!.l2!.vermogen_w, 663);
    assert.equal(fases!.l3!.vermogen_w, -228);
    assert.equal(fases!.l1!.spanning_v, 223.1);
    assert.equal(fases!.l2!.stroom_a, 3.8);
    assert.equal(faseCount(fases!), 3);
  });

  it("mapt v2 veldnamen", () => {
    const fases = mapP1Phases({
      power_l1_w: -676,
      power_l2_w: 133,
      power_l3_w: 0,
      current_l1_a: -4,
      current_l2_a: 2,
      current_l3_a: 0,
    });
    assert.ok(fases);
    assert.equal(fases!.l1!.vermogen_w, -676);
    assert.equal(fases!.l3!.vermogen_w, 0);
    assert.equal(faseCount(fases!), 3);
  });

  it("geeft null bij ontbrekende fasevelden", () => {
    assert.equal(mapP1Phases({ active_power_w: 500 }), null);
  });

  it("ondersteunt 1-fase (alleen L1)", () => {
    const fases = mapP1Phases({ active_power_l1_w: 420, active_voltage_l1_v: 230 });
    assert.ok(fases);
    assert.equal(faseCount(fases!), 1);
    assert.equal(fases!.l2, null);
  });
});
