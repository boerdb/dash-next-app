import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapOpenMeteoCurrentSky,
  mapOpenMeteoPrecipForecast,
} from "./open-meteo-client";

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

describe("mapOpenMeteoCurrentSky", () => {
  it("mapt bewolking en weercode", () => {
    const sky = mapOpenMeteoCurrentSky({
      current: {
        cloud_cover: 22,
        weather_code: 2,
        precipitation: 0,
        shortwave_radiation: 650,
      },
    });
    assert.equal(sky?.cloudCoverPct, 22);
    assert.equal(sky?.weatherCode, 2);
    assert.equal(sky?.shortwaveRadiationWm2, 650);
  });
});
