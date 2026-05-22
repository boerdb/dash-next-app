import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getWindDirection, windArrowRotation } from "./wind";

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
