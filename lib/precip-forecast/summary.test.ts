import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizePrecipForecast } from "./summary";
import type { PrecipForecastSlot } from "@/lib/api/types";

function slots(mm: number[]): PrecipForecastSlot[] {
  return mm.map((precipitationMm, i) => ({
    at: i * 3_600_000,
    label: `${String(i).padStart(2, "0")}:00`,
    precipitationMm,
    probabilityPct: null,
  }));
}

describe("summarizePrecipForecast", () => {
  it("meldt droog als er niets valt", () => {
    assert.equal(summarizePrecipForecast(slots([0, 0, 0]), 48), "Komende 48 uur droog");
  });

  it("noemt het eerste natte uur en het 24-uurstotaal", () => {
    assert.equal(
      summarizePrecipForecast(slots([0, 0, 0.7, 0.5]), 48),
      "Droog tot 02:00 · 1,2 mm komende 24 uur"
    );
  });

  it("zegt nu regen als het huidige uur nat is", () => {
    assert.equal(summarizePrecipForecast(slots([0.4, 0]), 48), "Nu regen · 0,4 mm komende 24 uur");
  });

  it("laat het totaal weg als de regen pas na 24 uur komt", () => {
    const mm = Array(30).fill(0);
    mm[26] = 2;
    assert.equal(summarizePrecipForecast(slots(mm), 48), "Droog tot 26:00");
  });
});
