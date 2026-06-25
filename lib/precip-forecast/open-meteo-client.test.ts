import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapOpenMeteoPrecipForecast } from "./open-meteo-client";

describe("mapOpenMeteoPrecipForecast", () => {
  it("mapt uurlijkse neerslag en kans", () => {
    const slots = mapOpenMeteoPrecipForecast({
      hourly: {
        time: [
          "2026-06-24T14:00",
          "2026-06-24T15:00",
          "2026-06-25T00:00",
        ],
        precipitation: [0.2, 1.5, 0],
        precipitation_probability: [40, 85, 10],
      },
    });
    assert.equal(slots.length, 3);
    assert.equal(slots[0].precipitationMm, 0.2);
    assert.equal(slots[1].probabilityPct, 85);
    assert.match(slots[2].label, /00:00/);
  });
});
