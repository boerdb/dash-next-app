import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatWaterMeterstandOpgave,
  waterMeterstandM3,
} from "./water-meter-stand";

describe("water meter stand", () => {
  it("berekent fysieke stand uit offset + sensor", () => {
    const stand = waterMeterstandM3(1404, 17.361);
    assert.equal(stand, 1421.4);
    assert.equal(formatWaterMeterstandOpgave(stand), "1421");
  });
});
