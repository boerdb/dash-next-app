import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyWs90RainPrimary,
  hasPiezoRain,
  isPiezoRainRateFloor,
  overlayDbRainPeriodTotals,
  resolveRainRateMm,
} from "./ws90-rain";

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

  it("laat WH40-kiepbakje staan naast piezo", () => {
    const r = applyWs90RainPrimary({
      wh40batt: "1.5",
      dailyrain_mm: 0.4,
      rainrate_mm: 1.2,
      last24hrain_mm: 0.4,
      dailyrain_piezo_mm: 0,
      rainrate_piezo_mm: 0,
    });
    assert.equal(r.dailyrain_mm, 0.4);
    assert.equal(r.rainrate_mm, 1.2);
    assert.equal(r.last24hrain_mm, 0.4);
    assert.equal(r.dailyrain_piezo_mm, 0);
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

  it("corrigeert vast piezo-minimum via uurtotaal", () => {
    assert.equal(
      resolveRainRateMm({
        rainrate_mm: 0.6,
        rainrate_piezo_mm: 0.6,
        rrain_piezo: 0.024,
        hourlyrain_mm: 2.4,
      }),
      2.4
    );
  });

  it("onderdrukt piezo-minimum zonder uuraccumulatie", () => {
    assert.equal(
      resolveRainRateMm({
        rainrate_mm: 0.6,
        rainrate_piezo_mm: 0.6,
        rrain_piezo: 0.024,
      }),
      0
    );
  });

  it("prefereert WH40-intensiteit boven vast piezo-minimum", () => {
    assert.equal(
      resolveRainRateMm({
        wh40batt: "1.5",
        rainrate_mm: 2.1,
        rainrate_piezo_mm: 0.6,
        rrain_piezo: 0.024,
      }),
      2.1
    );
  });

  it("laat hogere piezo-intensiteit ongemoeid", () => {
    assert.equal(resolveRainRateMm({ rainrate_mm: 3.2 }), 3.2);
  });
});

describe("isPiezoRainRateFloor", () => {
  it("herkent WS90-minimum", () => {
    assert.equal(isPiezoRainRateFloor(0.6), true);
    assert.equal(isPiezoRainRateFloor(0.1), false);
    assert.equal(isPiezoRainRateFloor(1.2), false);
  });
});
