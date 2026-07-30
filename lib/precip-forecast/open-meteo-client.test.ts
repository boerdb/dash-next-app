import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapOpenMeteoCurrentSky,
  mapOpenMeteoPrecipForecast,
} from "./open-meteo-client";

describe("mapOpenMeteoPrecipForecast", () => {
  it("mapt uurlijkse neerslag en kans vanaf nu", () => {
    const slots = mapOpenMeteoPrecipForecast(
      {
        hourly: {
          time: [
            "2026-06-24T12:00",
            "2026-06-24T14:00",
            "2026-06-24T15:00",
            "2026-06-25T00:00",
            "2026-06-25T12:00",
          ],
          precipitation: [0, 0.2, 1.5, 0, 5.7],
          precipitation_probability: [0, 40, 85, 10, 67],
        },
      },
      new Date("2026-06-24T13:30:00")
    );
    assert.equal(slots.length, 4);
    assert.equal(slots[0].precipitationMm, 0.2);
    assert.equal(slots[1].probabilityPct, 85);
    assert.match(slots[2].label, /00:00/);
    // Middag krijgt weekdag zodat do/vr 12:00 uniek zijn
    assert.match(slots[3].label, /12:00/);
    assert.notEqual(slots[3].label, "12:00");
    assert.equal(slots[3].precipitationMm, 5.7);
  });

  it("slaat uren in het verleden over", () => {
    const slots = mapOpenMeteoPrecipForecast(
      {
        hourly: {
          time: ["2026-06-24T10:00", "2026-06-24T11:00", "2026-06-24T14:00"],
          precipitation: [1, 2, 3],
          precipitation_probability: [10, 20, 30],
        },
      },
      new Date("2026-06-24T13:00:00")
    );
    assert.equal(slots.length, 1);
    assert.equal(slots[0].precipitationMm, 3);
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
