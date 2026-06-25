import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enrichWeerLive } from "./enrich-live";

describe("enrichWeerLive", () => {
  it("berekent dauwpunt en gevoelstemperatuur", () => {
    const r = enrichWeerLive({
      temp_c: 16.3,
      humidity: 85,
      windspd_avg10m_kmh: 2.9,
    });
    assert.equal(r.dauwpunt, 13.8);
    assert.equal(r.gevoelstemperatuur, 16.3);
  });

  it("windchill bij kou en wind", () => {
    const r = enrichWeerLive({
      temp_c: 5,
      humidity: 80,
      windspd_avg10m_kmh: 20,
    });
    assert.ok(Number(r.gevoelstemperatuur) < 5);
  });

  it("gevoelstemperatuur met alleen windspeed_kmh (GW1100)", () => {
    const r = enrichWeerLive({
      temp_c: 25,
      humidity: 62,
      windspeed_kmh: 0,
    });
    assert.equal(r.gevoelstemperatuur, 25);
    assert.equal(r.hitte_index_c, undefined);
  });

  it("berekent hitte-index bij warm vochtig weer", () => {
    const r = enrichWeerLive({
      temp_c: 32,
      humidity: 70,
      windspd_avg10m_kmh: 10,
    });
    assert.ok(Number(r.hitte_index_c) > 32);
  });
});
