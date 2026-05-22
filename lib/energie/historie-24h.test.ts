import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyLiveWattToHistorie,
  buildHistorie24h,
} from "@/lib/energie/historie-24h";

describe("buildHistorie24h", () => {
  it("vult 24 uur-slots en huidig watt", () => {
    const now = new Date();
    const key = now
      .toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam", hour12: false })
      .slice(0, 13);
    const hourly = new Map([[key, 100]]);
    const h = buildHistorie24h(hourly, -6);
    assert.equal(h.labels.length, 24);
    assert.equal(h.wattage.length, 24);
    const idx = h.labels.length - 1;
    assert.equal(h.wattage[idx], -6);
  });
});

describe("applyLiveWattToHistorie", () => {
  it("werkt huidig uur bij", () => {
    const label = new Date().toLocaleString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hour12: false,
    });
    const historie = {
      labels: ["12:00", `${label.padStart(2, "0")}:00`],
      wattage: [10, 20],
      gemiddelde: 15,
    };
    const out = applyLiveWattToHistorie(historie, -99);
    assert.equal(out.wattage[1], -99);
  });
});
