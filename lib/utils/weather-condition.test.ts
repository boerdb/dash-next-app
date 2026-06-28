import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getWeatherCondition } from "./weather-condition";
import type { OpenMeteoSky } from "@/lib/api/types";

const clearSky: OpenMeteoSky = {
  cloudCoverPct: 40,
  weatherCode: 2,
  precipitationMm: 0,
  shortwaveRadiationWm2: 400,
};

describe("getWeatherCondition · onweer", () => {
  it("toont GEEN onweer bij enkel onweersgevoelige lucht (geen echte inslag)", () => {
    const condition = getWeatherCondition(
      {
        wh57batt: "5",
        temp_c: 34,
        humidity: 55,
        hitte_index_c: 40,
        solarradiation: 500,
      },
      "day",
      false,
      clearSky
    );
    assert.notEqual(condition, "thunder");
  });

  it("toont onweer bij gelatchte echte activiteit", () => {
    const condition = getWeatherCondition(
      { temp_c: 24, lightning_storm_risk: true, solarradiation: 300 },
      "day"
    );
    assert.equal(condition, "thunder");
  });

  it("toont onweer bij Open-Meteo weercode 95 (corroboratie)", () => {
    const condition = getWeatherCondition(
      { temp_c: 24, solarradiation: 100 },
      "day",
      false,
      { ...clearSky, weatherCode: 95 }
    );
    assert.equal(condition, "thunder");
  });

  it("toont storm bij Open-Meteo weercode 96 (hagel)", () => {
    const condition = getWeatherCondition(
      { temp_c: 24, solarradiation: 100 },
      "day",
      false,
      { ...clearSky, weatherCode: 96 }
    );
    assert.equal(condition, "storm");
  });

  it("toont onweer bij actieve KNMI-onweerwaarschuwing", () => {
    const condition = getWeatherCondition(
      { temp_c: 24, solarradiation: 100 },
      "day",
      false,
      clearSky,
      true
    );
    assert.equal(condition, "thunder");
  });

  it("onweer overschrijft nacht-periode (Open-Meteo)", () => {
    const condition = getWeatherCondition(
      { temp_c: 18 },
      "night",
      true,
      { ...clearSky, weatherCode: 95 }
    );
    assert.equal(condition, "thunder");
  });
});

describe("getWeatherCondition · lokale zon", () => {
  const sunnyMeteo: OpenMeteoSky = {
    cloudCoverPct: 20,
    weatherCode: 1,
    precipitationMm: 0,
    shortwaveRadiationWm2: 650,
  };

  it("verdonkert niet bij lage lokale straling (sensor in schaduw)", () => {
    const condition = getWeatherCondition(
      { temp_c: 22, solarradiation: 80 },
      "day",
      false,
      sunnyMeteo
    );
    assert.equal(condition, "sunny");
  });

  it("heldert wél op als model bewolkt maar zon schijnt lokaal", () => {
    const condition = getWeatherCondition(
      { temp_c: 22, solarradiation: 700 },
      "day",
      false,
      {
        cloudCoverPct: 90,
        weatherCode: 3,
        precipitationMm: 0,
        shortwaveRadiationWm2: 100,
      }
    );
    assert.equal(condition, "sunny");
  });
});
