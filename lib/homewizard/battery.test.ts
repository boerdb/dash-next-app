import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateBatterijen,
  batteryIdFromUrl,
  mapBatteryRaw,
  parseBatteryUrls,
  parseSoc,
} from "./battery";

describe("homewizard battery", () => {
  it("parseert batterij-URLs", () => {
    assert.deepEqual(
      parseBatteryUrls("http://a/1, http://b/2"),
      ["http://a/1", "http://b/2"]
    );
    assert.deepEqual(parseBatteryUrls(""), []);
  });

  it("haalt id uit IP", () => {
    assert.equal(
      batteryIdFromUrl("http://192.168.1.179/api/v1/data"),
      "179"
    );
  });

  it("leest SOC uit verschillende velden", () => {
    assert.equal(parseSoc({ state_of_charge: 72.4 }), 72);
    assert.equal(parseSoc({ state_of_charge_pct: 55 }), 55);
    assert.equal(parseSoc({ battery_percentage: 80 }), 80);
    assert.equal(parseSoc({}), null);
  });

  it("mapt offline batterij", () => {
    const b = mapBatteryRaw(null, "170");
    assert.equal(b.bereikbaar, false);
    assert.equal(b.soc, null);
  });

  it("aggregeert online batterijen", () => {
    const agg = aggregateBatterijen([
      { id: "179", soc: 80, vermogen_w: 500, bereikbaar: true },
      { id: "170", soc: 60, vermogen_w: -200, bereikbaar: true },
      { id: "x", soc: null, vermogen_w: 0, bereikbaar: false },
    ]);
    assert.equal(agg.vermogen_totaal, 300);
    assert.equal(agg.soc_gemiddeld, 70);
  });
});
