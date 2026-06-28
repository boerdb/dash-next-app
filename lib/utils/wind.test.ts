import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getWindDirection,
  nextArrowRotation,
  windArrowRotation,
} from "./wind";

describe("wind", () => {
  it("ZW richting", () => {
    assert.equal(getWindDirection(225), "ZW");
    assert.equal(windArrowRotation(225), 225);
  });

  it("pijl 180° van waait-heen (45) naar komt-vandaan (225)", () => {
    const from = 225;
    const wrongBlowTo = (from + 180) % 360;
    assert.equal(wrongBlowTo, 45);
    assert.notEqual(windArrowRotation(from), wrongBlowTo);
  });
});

describe("nextArrowRotation", () => {
  it("draait de korte weg over de 0°/360°-grens (350 → 10)", () => {
    const next = nextArrowRotation(350, 10);
    assert.equal(next, 370);
    assert.equal(Math.abs(next - 350), 20);
  });

  it("draait de korte weg terug (10 → 350)", () => {
    const next = nextArrowRotation(10, 350);
    assert.equal(next, -10);
    assert.equal(Math.abs(next - 10), 20);
  });

  it("west → oost blijft een halve slag (≤180°)", () => {
    const next = nextArrowRotation(270, 90);
    assert.ok(Math.abs(next - 270) <= 180);
  });

  it("behoudt continue waarde voorbij 360° en wijst naar doel", () => {
    const next = nextArrowRotation(725, 90);
    assert.equal(((next % 360) + 360) % 360, 90);
    assert.ok(Math.abs(next - 725) <= 180);
  });
});
