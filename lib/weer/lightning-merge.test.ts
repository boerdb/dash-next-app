import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeLightningStormRisk,
  getLightningStatus,
  getLightningStatusLabel,
  hasActualLightningActivity,
  isBarometerStormForecast,
  isConvectiveStormSetup,
  isThunderProneAirmass,
  pickBestLightningFields,
  resolveLightningStormRisk,
  shouldAccelerateLightningPoll,
  shouldClearStormRiskLatch,
  STORM_LATCH_CLEAR_RISE_HPA,
  STORM_RISK_LATCH_MS,
} from "./lightning-storm";
import { isWh57Detected } from "./sensor-status";
import { mergeWeerLiveBySource } from "./merge-weer-sources";
import { mapGatewayLightning, mapGatewayLive } from "./ecowitt-local-client";

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
      "Onweersgevoelige lucht · dalende druk"
    );
    assert.equal(
      getLightningStatusLabel({ wh57batt: "5" }),
      "WH57 actief · geen inslagen"
    );
  });

  it("detecteert convectieve setup bij warm vochtig weer", () => {
    const data = {
      wh57batt: "5",
      temp_c: 34,
      humidity: 55,
      hitte_index_c: 40.2,
      barom_trend_direction: "steady" as const,
      barom_trend_delta_hpa: -0.4,
    };
    assert.equal(isConvectiveStormSetup(data), true);
    assert.equal(computeLightningStormRisk(data), true);
    assert.equal(
      getLightningStatusLabel(data),
      "Onweersgevoelige lucht · warm & vochtig"
    );
  });

  it("airmass-heuristiek latcht niet en geeft geen onweer-hero", () => {
    const airmass = {
      wh57batt: "5",
      temp_c: 34,
      humidity: 55,
      hitte_index_c: 40.2,
      barom_trend_direction: "steady" as const,
      barom_trend_delta_hpa: -0.4,
    };
    assert.equal(isThunderProneAirmass(airmass), true);
    assert.equal(hasActualLightningActivity(airmass), false);
    assert.equal(getLightningStatus(airmass), "airmass");
    // Geen echte activiteit → latch blijft uit.
    const resolved = resolveLightningStormRisk(airmass, null);
    assert.equal(resolved.lightning_storm_risk, false);
  });

  it("echte inslag latcht wél", () => {
    const now = Date.now();
    const strikeTime = new Date(now - 4 * 60_000)
      .toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" })
      .replace("T", " ")
      .slice(0, 19);
    const live = { wh57batt: "5", lightning_km: 8, lightning_time: strikeTime };
    assert.equal(hasActualLightningActivity(live), true);
    const resolved = resolveLightningStormRisk(live, null, now);
    assert.equal(resolved.lightning_storm_risk, true);
  });

  it("versnelt poll niet bij enkel onweersgevoelige lucht", () => {
    assert.equal(
      shouldAccelerateLightningPoll({
        wh57batt: "5",
        temp_c: 34,
        humidity: 55,
        hitte_index_c: 40.2,
        lightning_km: 0,
      }),
      false
    );
  });

  it("houdt stormkans aan via latch na dalende druk", () => {
    const now = Date.parse("2026-06-19T15:00:00");
    const until = new Date(now + STORM_RISK_LATCH_MS)
      .toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" })
      .replace("T", " ")
      .slice(0, 19);
    const previous = {
      wh57batt: "5",
      lightning_storm_risk: true,
      lightning_storm_risk_until: until,
    };
    const current = {
      wh57batt: "5",
      temp_c: 22,
      humidity: 40,
      barom_trend_direction: "steady" as const,
      barom_trend_delta_hpa: -0.2,
    };
    const resolved = resolveLightningStormRisk(current, previous, now);
    assert.equal(resolved.lightning_storm_risk, true);
    assert.equal(resolved.lightning_storm_risk_until, until);
    assert.equal(
      getLightningStatusLabel(resolved),
      "Kans op onweer · nog actief"
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

  it("negeert placeholder afstand", () => {
    const mapped = mapGatewayLightning({
      lightning: [{ distance: "--.-", count: "3" }],
    });
    assert.equal(mapped.lightning_km, undefined);
    assert.equal(mapped.lightning_num, 3);
  });

  it("wist afstand en tijd bij count 0", () => {
    const mapped = mapGatewayLightning({
      lightning: [
        {
          distance: "18",
          count: "0",
          timestamp: "12345678",
          battery: "5",
        },
      ],
    });
    assert.equal(mapped.lightning_num, 0);
    assert.equal(mapped.lightning_km, null);
    assert.equal(mapped.lightning_time, null);
    assert.equal(mapped.wh57batt, "5");
  });
});

describe("shouldClearStormRiskLatch", () => {
  it("klaart niet bij na-storm ruis (kleine drukstijging)", () => {
    assert.equal(
      shouldClearStormRiskLatch({
        barom_trend_direction: "up",
        barom_trend_delta_hpa: 0.9,
      }),
      false
    );
  });

  it("klaart wel bij decisief drukherstel", () => {
    assert.equal(
      shouldClearStormRiskLatch({
        barom_trend_direction: "up",
        barom_trend_delta_hpa: STORM_LATCH_CLEAR_RISE_HPA,
      }),
      true
    );
  });

  it("klaart niet bij dalende druk", () => {
    assert.equal(
      shouldClearStormRiskLatch({
        barom_trend_direction: "down",
        barom_trend_delta_hpa: -3,
      }),
      false
    );
  });
});

describe("resolveLightningStormRisk latch-stabiliteit", () => {
  it("blijft gelatcht bij jitterende drukstijging onder drempel", () => {
    const now = Date.now();
    const until = new Date(now + STORM_RISK_LATCH_MS)
      .toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" })
      .replace("T", " ")
      .slice(0, 19);
    const previous = {
      lightning_storm_risk: true,
      lightning_storm_risk_until: until,
    };
    // Geen actieve trigger, alleen lichte drukstijging (ruis).
    const resolved = resolveLightningStormRisk(
      { barom_trend_direction: "up", barom_trend_delta_hpa: 0.9 },
      previous,
      now
    );
    assert.equal(resolved.lightning_storm_risk, true);
  });
});

describe("mapGatewayLive", () => {
  const raw = {
    common_list: [
      { id: "0x02", val: "23.4", unit: "C" },
      { id: "0x07", val: "66%" },
      { id: "5", val: "0.978 kPa" },
      { id: "0x0B", val: "7.92 km/h" },
      { id: "0x0C", val: "12.96 km/h" },
      { id: "0x19", val: "18.00 km/h" },
      { id: "0x15", val: "513.73 W/m2" },
      { id: "0x17", val: "4" },
      { id: "0x0A", val: "256" },
    ],
    piezoRain: [
      { id: "0x0E", val: "0.0 mm/Hr" },
      { id: "0x10", val: "5.9 mm" },
      { id: "0x12", val: "14.5 mm" },
      { id: "0x13", val: "14.5 mm", battery: "5" },
    ],
    wh25: [
      {
        intemp: "27.8",
        unit: "C",
        inhumi: "65%",
        abs: "1020.2 hPa",
        rel: "1021.4 hPa",
      },
    ],
    ch_aisle: [{ channel: "2", temp: "28.5", unit: "C", humidity: "59%" }],
  };

  it("mapt wind, richting en dagmax", () => {
    const m = mapGatewayLive(raw);
    assert.equal(m.winddir, 256);
    assert.equal(m.windspeed_kmh, 7.92);
    assert.equal(m.windgust_kmh, 12.96);
    assert.equal(m.maxdailygust_kmh, 18);
  });

  it("mapt temp, vocht, zon, UV en VPD", () => {
    const m = mapGatewayLive(raw);
    assert.equal(m.temp_c, 23.4);
    assert.equal(m.humidity, 66);
    assert.equal(m.solarradiation, 513.73);
    assert.equal(m.uv, 4);
    assert.equal(m.vpd, 0.978);
  });

  it("mapt piezo-regen, binnenklimaat en kanaal 2", () => {
    const m = mapGatewayLive(raw);
    assert.equal(m.rainrate_piezo_mm, 0);
    assert.equal(m.dailyrain_piezo_mm, 5.9);
    assert.equal(m.monthlyrain_piezo_mm, 14.5);
    assert.equal(m.tempin_c, 27.8);
    assert.equal(m.humidityin, 65);
    assert.equal(m.baromrel_hpa, 1021.4);
    assert.equal(m.temp2_c, 28.5);
    assert.equal(m.humidity2, 59);
  });

  it("converteert °F en mph indien nodig", () => {
    const m = mapGatewayLive({
      common_list: [
        { id: "0x02", val: "50", unit: "F" },
        { id: "0x0B", val: "10 mph" },
      ],
    });
    assert.equal(m.temp_c, 10);
    assert.equal(m.windspeed_kmh, 16.1);
  });

  it("geeft lege mapping bij lege respons", () => {
    assert.deepEqual(mapGatewayLive({}), {});
  });
});

describe("shouldAccelerateLightningPoll", () => {
  it("true bij recente inslag", () => {
    const now = Date.now();
    const strikeTime = new Date(now - 5 * 60_000)
      .toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" })
      .replace("T", " ")
      .slice(0, 19);
    assert.equal(
      shouldAccelerateLightningPoll({
        lightning_km: 12,
        lightning_time: strikeTime,
      }),
      true
    );
  });

  it("true bij onweersfront zonder inslag", () => {
    assert.equal(
      shouldAccelerateLightningPoll({
        wh57batt: "5",
        lightning_km: 22,
      }),
      true
    );
  });

  it("false zonder WH57-activiteit", () => {
    assert.equal(shouldAccelerateLightningPoll({ temp_c: 20 }), false);
    assert.equal(shouldAccelerateLightningPoll(null), false);
  });

  it("true bij actieve dagteller zonder recente inslag", () => {
    assert.equal(
      shouldAccelerateLightningPoll({
        wh57batt: "5",
        lightning_num: 314,
        lightning_km: 0,
      }),
      true
    );
  });
});
