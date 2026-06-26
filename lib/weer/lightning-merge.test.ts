import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeLightningStormRisk,
  getLightningStatusLabel,
  isBarometerStormForecast,
  pickBestLightningFields,
} from "./lightning-storm";
import { isWh57Detected } from "./sensor-status";
import { mergeWeerLiveBySource } from "./merge-weer-sources";
import { mapGatewayLightning } from "./ecowitt-local-client";

describe("lightning storm risk", () => {
  it("detecteert console-achtige stormkans bij dalende druk", () => {
    const data = {
      wh57batt: "5",
      barom_trend_direction: "down" as const,
      barom_trend_delta_hpa: -1.2,
      temp_c: 32,
      humidity: 55,
    };
    assert.equal(isBarometerStormForecast(data), true);
    assert.equal(computeLightningStormRisk(data), true);
  });

  it("kiest bron met bliksemdata", () => {
    const best = pickBestLightningFields(
      { wh57batt: "5", lightning_km: null },
      { wh57batt: "5", lightning_km: 12, lightning_num: 1 }
    );
    assert.equal(best.lightning_km, 12);
  });

  it("labelt WH57-detectie zonder inslag", () => {
    assert.equal(isWh57Detected({ wh57batt: "5" }), true);
    assert.equal(
      getLightningStatusLabel({
        wh57batt: "5",
        barom_trend_direction: "down",
        barom_trend_delta_hpa: -1.2,
        temp_c: 32,
        humidity: 55,
      }),
      "Kans op onweer (barometer)"
    );
    assert.equal(
      getLightningStatusLabel({ wh57batt: "5" }),
      "WH57 actief · geen inslagen"
    );
  });
});

describe("mergeWeerLiveBySource", () => {
  it("combineert GW1100 buiten met HP2550 binnen", () => {
    const merged = mergeWeerLiveBySource(
      {
        stationtype: "GW1100A_V2.4.5",
        temp_c: 25,
        humidity: 60,
        server_timestamp: "2026-06-26 14:00:00",
      },
      {
        stationtype: "HP2550_Pro_V2.1.4",
        tempin_c: 27,
        humidityin: 65,
        server_timestamp: "2026-06-26 14:00:30",
      }
    );
    assert.equal(merged.temp_c, 25);
    assert.equal(merged.tempin_c, 27);
    assert.equal(merged.weer_sources?.gw1100_at, "2026-06-26 14:00:00");
    assert.equal(merged.weer_sources?.hp2550_at, "2026-06-26 14:00:30");
  });
});

describe("mapGatewayLightning", () => {
  it("parsed afstand en count uit get_livedata_info", () => {
    const mapped = mapGatewayLightning({
      lightning: [{ distance: "18", count: "2", battery: "5" }],
    });
    assert.equal(mapped.lightning_km, 18);
    assert.equal(mapped.lightning_num, 2);
    assert.equal(mapped.wh57batt, "5");
  });

  it("negeert placeholder waarden", () => {
    const mapped = mapGatewayLightning({
      lightning: [{ distance: "--.-", count: "0" }],
    });
    assert.equal(mapped.lightning_km, undefined);
  });
});
