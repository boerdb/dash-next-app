import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyWs90RainPrimary, hasPiezoRain, overlayDbRainPeriodTotals, resolveRainRateMm } from "./ws90-rain";

describe("applyWs90RainPrimary", () => {
  it("kopieert piezo naar standaard regenvelden", () => {
    const r = applyWs90RainPrimary({
      dailyrain_mm: 0,
      dailyrain_piezo_mm: 0.6,
      rainrate_piezo_mm: 0.1,
      monthlyrain_piezo_mm: 12.4,
      yearlyrain_piezo_mm: 180,
    });
    assert.equal(r.dailyrain_mm, 0.6);
    assert.equal(r.rainrate_mm, 0.1);
    assert.equal(r.monthlyrain_mm, 12.4);
    assert.equal(r.yearlyrain_mm, 180);
  });

  it("laat data ongewijzigd zonder piezo", () => {
    const r = applyWs90RainPrimary({ dailyrain_mm: 3, rainrate_mm: 0.2 });
    assert.equal(r.dailyrain_mm, 3);
    assert.equal(r.rainrate_mm, 0.2);
  });
});

describe("hasPiezoRain", () => {
  it("detecteert piezo dagregen", () => {
    assert.equal(hasPiezoRain({ dailyrain_piezo_mm: 0.1 }), true);
    assert.equal(hasPiezoRain({ dailyrain_mm: 1 }), false);
  });
});

describe("overlayDbRainPeriodTotals", () => {
  it("vervangt gateway-tellers door DB-totalen bij WS90", () => {
    const r = overlayDbRainPeriodTotals(
      {
        dailyrain_piezo_mm: 0.6,
        monthlyrain_mm: 2,
        yearlyrain_mm: 2,
      },
      48.5,
      312.0
    );
    assert.equal(r.monthlyrain_mm, 48.5);
    assert.equal(r.yearlyrain_mm, 312);
  });

  it("laat WH65-data ongewijzigd zonder piezo", () => {
    const data = { monthlyrain_mm: 40, yearlyrain_mm: 200 };
    assert.deepEqual(overlayDbRainPeriodTotals(data, 99, 999), data);
  });
});

describe("resolveRainRateMm", () => {
  it("geeft 0 mm/u door", () => {
    assert.equal(resolveRainRateMm({ rainrate_mm: 0 }), 0);
    assert.equal(resolveRainRateMm({ rainrate_piezo_mm: 0 }), 0);
  });

  it("prefereert genormaliseerd veld", () => {
    assert.equal(
      resolveRainRateMm({ rainrate_mm: 0.6, rainrate_piezo_mm: 0.1 }),
      0.6
    );
  });
});
