import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapEnphaseProduction, toEnphaseLive } from "./map";

describe("enphase map", () => {
  it("gebruikt api/v1 voor vandaag en vermogen", () => {
    const mapped = mapEnphaseProduction(
      {
        wattHoursToday: 8353,
        wattsNow: 2154,
        wattHoursLifetime: 6083914,
      },
      null,
      null
    );
    assert.equal(mapped.vandaag_kwh, 8.35);
    assert.equal(mapped.vermogen_w, 2154);
  });

  it("berekent vandaag uit whLifetime-delta bij unmetered gateway", () => {
    const mapped = mapEnphaseProduction(
      null,
      {
        production: [
          {
            type: "inverters",
            wNow: 1200,
            whLifetime: 5107000,
          },
        ],
      },
      5106119
    );
    assert.equal(mapped.vandaag_kwh, 0.88);
    assert.equal(mapped.vermogen_w, 1200);
  });

  it("markeert live als bereikbaar bij data", () => {
    const live = toEnphaseLive({
      vermogen_w: 500,
      vandaag_kwh: 3.2,
      wh_lifetime: 1000,
    });
    assert.equal(live.bereikbaar, true);
    assert.equal(live.vandaag_kwh, 3.2);
  });
});
