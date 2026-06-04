import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMaandToegestaan,
  maandDagRange,
  todayAmsterdamDate,
} from "./maand-labels";
import { maandNavigatie } from "./maand-labels";

describe("maand labels", () => {
  it("maandDagRange voor juni", () => {
    const r = maandDagRange(2026, 6);
    assert.equal(r.van, "2026-06-01");
    assert.equal(r.tot, "2026-07-01");
  });

  it("staat huidige en vorige maand toe", () => {
    const today = todayAmsterdamDate();
    const [y, m] = today.split("-").map(Number);
    assert.equal(isMaandToegestaan(y, m), true);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    assert.equal(isMaandToegestaan(prevY, prevM), true);
  });

  it("navigatie: geen volgende maand in de toekomst", () => {
    const today = todayAmsterdamDate();
    const [y, m] = today.split("-").map(Number);
    const n = maandNavigatie(y, m, today);
    assert.equal(n.kan_volgende_maand, false);
    assert.equal(n.kan_vorige_maand, true);
  });
});
