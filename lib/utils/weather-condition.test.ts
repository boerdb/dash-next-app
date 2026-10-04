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

describe("getWeatherCondition · mist", () => {
  const humidCalm = {
    temp_c: 12,
    humidity: 97,
    windspd_avg10m_kmh: 1.2,
    solarradiation: 0,
  };

  it("zet geen mist-hero bij hoge vochtigheid zonder Open-Meteo-code 45/48", () => {
    const condition = getWeatherCondition(humidCalm, "night", true, {
      cloudCoverPct: 80,
      weatherCode: 3,
      precipitationMm: 0,
      shortwaveRadiationWm2: 0,
    });
    assert.equal(condition, "night-cloudy");
  });

  it("zet mist als het station vochtig is én Open-Meteo code 45 geeft", () => {
    const condition = getWeatherCondition(humidCalm, "night", true, {
      cloudCoverPct: 100,
      weatherCode: 45,
      precipitationMm: 0,
      shortwaveRadiationWm2: 0,
    });
    assert.equal(condition, "fog");
  });

  it("houdt de stationheuristiek als Open-Meteo ontbreekt", () => {
    const condition = getWeatherCondition(humidCalm, "night", true, null);
    assert.equal(condition, "fog");
  });

  it("laat Open-Meteo-mist 's nachts door ook zonder hoge stationvochtigheid", () => {
    const condition = getWeatherCondition(
      { temp_c: 12, humidity: 80, windspd_avg10m_kmh: 8, solarradiation: 0 },
      "night",
      true,
      {
        cloudCoverPct: 100,
        weatherCode: 48,
        precipitationMm: 0,
        shortwaveRadiationWm2: 0,
      }
    );
    assert.equal(condition, "fog");
  });
});

describe("getWeatherCondition · regen", () => {
  const rainyMeteo: OpenMeteoSky = {
    cloudCoverPct: 90,
    weatherCode: 61,
    precipitationMm: 0.4,
    shortwaveRadiationWm2: 80,
  };

  it("toont regen bij actieve station-intensiteit", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, rainrate_mm: 0.8, solarradiation: 50 },
      "day",
      false,
      rainyMeteo
    );
    assert.equal(condition, "rain");
  });

  it("negeert Open-Meteo-regen zodra het station droog is", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, rainrate_mm: 0, solarradiation: 400 },
      "day",
      false,
      rainyMeteo
    );
    assert.notEqual(condition, "rain");
    assert.equal(condition, "partly-cloudy");
  });
});

describe("getWeatherCondition · dagperioden", () => {
  it("toont dusk in avondperiode ook als zon onder horizon is", () => {
    const condition = getWeatherCondition(
      { temp_c: 22, solarradiation: 0 },
      "evening",
      true,
      clearSky
    );
    assert.equal(condition, "dusk");
  });

  it("toont night bij heldere nacht", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, solarradiation: 0 },
      "night",
      true,
      {
        cloudCoverPct: 5,
        weatherCode: 0,
        precipitationMm: 0,
        shortwaveRadiationWm2: 0,
      }
    );
    assert.equal(condition, "night");
  });

  it("toont deels bewolkte nacht en negeert instraling van 0", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, solarradiation: 0 },
      "night",
      true,
      { ...clearSky, shortwaveRadiationWm2: 0 }
    );
    assert.equal(condition, "night-partly-cloudy");
  });

  it("toont bewolkte nacht", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, solarradiation: 0 },
      "night",
      true,
      {
        cloudCoverPct: 95,
        weatherCode: 3,
        precipitationMm: 0,
        shortwaveRadiationWm2: 0,
      }
    );
    assert.equal(condition, "night-cloudy");
  });

  it("valt terug op heldere nacht zonder luchtdata", () => {
    const condition = getWeatherCondition(
      { temp_c: 18, solarradiation: 0 },
      "night",
      true,
      null
    );
    assert.equal(condition, "night");
  });

  it("laat regen voorgaan op een bewolkte nacht", () => {
    const condition = getWeatherCondition(
      { temp_c: 12, rainrate_mm: 1.2 },
      "night",
      true,
      {
        cloudCoverPct: 100,
        weatherCode: 61,
        precipitationMm: 1,
        shortwaveRadiationWm2: 0,
      }
    );
    assert.equal(condition, "rain");
  });
});
