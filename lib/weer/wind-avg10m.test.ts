import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WIND_AVG_WINDOW_MS,
  averageWindSamples,
  applyWindAvg10m,
  updateWindSamples,
} from "./wind-avg10m";

describe("wind avg 10m", () => {
  const t0 = 1_700_000_000_000;

  it("gemiddelde over samples in venster", () => {
    const samples = updateWindSamples(undefined, 10, t0);
    const more = updateWindSamples(samples, 20, t0 + 60_000);
    assert.equal(averageWindSamples(more), 15);
  });

  it("verwijdert samples ouder dan 10 minuten", () => {
    const old = updateWindSamples(undefined, 30, t0);
    const kept = updateWindSamples(old, 10, t0 + WIND_AVG_WINDOW_MS + 1);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].kmh, 10);
    assert.equal(averageWindSamples(kept), 10);
  });

  it("applyWindAvg10m valt terug op gateway zonder windspeed", () => {
    const r = applyWindAvg10m({ windspd_avg10m_kmh: 8 }, null);
    assert.equal(r.windspd_avg10m_kmh, 8);
    assert.equal(r._wind_samples?.length, 0);
  });

  it("applyWindAvg10m berekent gemiddelde uit vorige samples", () => {
    const prev = applyWindAvg10m({ windspeed_kmh: 10 }, null);
    const next = applyWindAvg10m(
      { windspeed_kmh: 20 },
      { ...prev, _wind_samples: prev._wind_samples }
    );
    assert.equal(next.windspd_avg10m_kmh, 15);
  });
});
