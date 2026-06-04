import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateBatterijen,
  batteryIdFromUrl,
  buildBatteryEndpoints,
  mapBatteryV2,
  normalizeBatteryEndpoint,
  parseBatteryUrls,
  parseSoc,
} from "./battery";

describe("homewizard battery", () => {
  it("parseert batterij-URLs", () => {
    assert.deepEqual(
      parseBatteryUrls("https://192.168.1.179, https://192.168.1.170"),
      ["https://192.168.1.179", "https://192.168.1.170"]
    );
    assert.deepEqual(parseBatteryUrls(""), []);
  });

  it("normaliseert v1-URL naar v2 measurement", () => {
    const n = normalizeBatteryEndpoint("http://192.168.1.179/api/v1/data");
    assert.equal(n.v1Url, "http://192.168.1.179/api/v1/data");
    assert.equal(n.v2Url, "https://192.168.1.179/api/measurement");
  });

  it("bouwt endpoints met tokens", () => {
    const eps = buildBatteryEndpoints(
      ["https://192.168.1.179", "https://192.168.1.170"],
      ["tok-a", "tok-b"]
    );
    assert.equal(eps[0]?.token, "tok-a");
    assert.equal(eps[1]?.token, "tok-b");
  });

  it("haalt id uit IP", () => {
    assert.equal(batteryIdFromUrl("https://192.168.1.179"), "179");
  });

  it("leest SOC uit v2", () => {
    assert.equal(parseSoc({ state_of_charge_pct: 55 }), 55);
  });

  it("mapt v2 measurement", () => {
    const b = mapBatteryV2({ power_w: -400, state_of_charge_pct: 72 }, "179");
    assert.equal(b.bereikbaar, true);
    assert.equal(b.soc, 72);
    assert.equal(b.vermogen_w, -400);
  });

  it("aggregeert met P1-groep fallback", () => {
    const agg = aggregateBatterijen(
      [{ id: "179", soc: null, vermogen_w: 0, bereikbaar: false }],
      { mode: "zero", aantal: 2, vermogen_w: -500, bereikbaar: true }
    );
    assert.equal(agg.vermogen_totaal, -500);
    assert.equal(agg.soc_gemiddeld, null);
  });
});
