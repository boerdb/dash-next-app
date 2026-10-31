import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseNearbyVisibility } from "./nearby-visibility";

const feed = {
  actual: {
    stationmeasurements: [
      { stationname: "Meetstation Leeuwarden", lat: 53.22, lon: 5.77, visibility: 177, timestamp: "2026-10-29T22:40:00" },
      { stationname: "Meetstation Vlieland", lat: 53.25, lon: 4.92, visibility: 148, timestamp: "2026-10-29T22:40:00" },
      { stationname: "Meetstation Houtribdijk", lat: 52.65, lon: 5.4, visibility: null },
      { stationname: "Meetstation De Bilt", lat: 52.1, lon: 5.18, visibility: 20 },
    ],
  },
};

describe("parseNearbyVisibility", () => {
  it("kiest het dichtstbijzijnde station, niet het laagste zicht", () => {
    const result = parseNearbyVisibility(feed);
    assert.equal(result?.stationName, "Leeuwarden");
    assert.equal(result?.visibilityM, 177);
  });

  it("negeert stations zonder zichtmeting en verre stations", () => {
    const result = parseNearbyVisibility({
      actual: { stationmeasurements: feed.actual.stationmeasurements.slice(2) },
    });
    assert.equal(result, null);
  });

  it("geeft null bij een onverwachte feed", () => {
    assert.equal(parseNearbyVisibility(null), null);
    assert.equal(parseNearbyVisibility({ actual: {} }), null);
  });
});
