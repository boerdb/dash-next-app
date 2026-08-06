import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyWs90Lux,
  luxFromSolarWm2,
  parseGatewayLightReading,
  resolveIlluminanceLux,
  solarWm2FromLux,
} from "./ws90-lux";

describe("ws90 lux", () => {
  it("converteert W/m² naar lux", () => {
    assert.equal(luxFromSolarWm2(442), 56001);
    assert.equal(solarWm2FromLux(56000), 441.99);
  });

  it("parsed gateway-licht met eenheid", () => {
    assert.deepEqual(parseGatewayLightReading("513.73 W/m2"), {
      solarWm2: 513.73,
      lux: 65090,
    });
    assert.deepEqual(parseGatewayLightReading("56000 lux"), {
      lux: 56000,
      solarWm2: 441.99,
    });
    assert.deepEqual(parseGatewayLightReading("65.1 kLux"), {
      lux: 65100,
      solarWm2: 513.81,
    });
  });

  it("leidt lux af uit zonstraling bij WS90", () => {
    const live = applyWs90Lux({
      wh90batt: "3.18",
      solarradiation: 158.72,
    });
    assert.equal(live.illuminance_lux, 20110);
    assert.equal(resolveIlluminanceLux(live), 20110);
  });

  it("gebruikt expliciet lux-veld indien aanwezig", () => {
    const live = { illuminance_lux: 42000, solarradiation: 100, wh90batt: "3" };
    assert.equal(resolveIlluminanceLux(live), 42000);
  });
});
