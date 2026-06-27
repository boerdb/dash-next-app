import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowWindChill } from "./wind-chill-display";

describe("shouldShowWindChill", () => {
  it("toont bij ≤10 °C en wind ≥12 km/u (3 Bft)", () => {
    assert.equal(
      shouldShowWindChill({
        temp_c: 8,
        windspd_avg10m_kmh: 15,
        gevoelstemperatuur: 5.2,
      }),
      true
    );
  });

  it("verbergt boven 10 °C", () => {
    assert.equal(
      shouldShowWindChill({
        temp_c: 16.3,
        windspd_avg10m_kmh: 20,
        gevoelstemperatuur: 16.3,
      }),
      false
    );
  });

  it("verbergt onder 3 Bft (<12 km/u)", () => {
    assert.equal(
      shouldShowWindChill({
        temp_c: 5,
        windspd_avg10m_kmh: 8,
        gevoelstemperatuur: 5,
      }),
      false
    );
  });

  it("verbergt zonder gevoelstemperatuur", () => {
    assert.equal(
      shouldShowWindChill({
        temp_c: 5,
        windspd_avg10m_kmh: 20,
      }),
      false
    );
  });
});
