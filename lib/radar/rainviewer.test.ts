import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseRainviewerMaps,
  radarCenterImageUrl,
  radarTileUrl,
} from "./rainviewer";

const FIXTURE = {
  version: "2.0",
  generated: 1780942439,
  host: "https://tilecache.rainviewer.com",
  radar: {
    past: [
      { time: 1780935000, path: "/v2/radar/fb1bff913b4b" },
      { time: 1780942200, path: "/v2/radar/e233d9fda38e" },
    ],
    nowcast: [],
  },
};

describe("parseRainviewerMaps", () => {
  it("parsed host en frames chronologisch", () => {
    const r = parseRainviewerMaps(FIXTURE, new Date("2026-06-07T12:00:00Z"));
    assert.equal(r.host, "https://tilecache.rainviewer.com");
    assert.equal(r.frames.length, 2);
    assert.equal(r.frames[0].time, 1780935000);
    assert.equal(r.frames[1].tilePath, "/v2/radar/e233d9fda38e");
    assert.match(r.frames[0].label, /\d/u);
  });

  it("levert lege frames bij ontbrekende radar", () => {
    const r = parseRainviewerMaps({ host: "https://x.com" });
    assert.deepEqual(r.frames, []);
  });
});

describe("radarTileUrl", () => {
  it("bouwt tile-URL volgens RainViewer-patroon", () => {
    const url = radarTileUrl(
      "https://tilecache.rainviewer.com",
      "/v2/radar/abc",
      7,
      65,
      42
    );
    assert.equal(
      url,
      "https://tilecache.rainviewer.com/v2/radar/abc/512/7/65/42/2/1_1.png"
    );
  });
});

describe("radarCenterImageUrl", () => {
  it("bouwt center-image URL op coördinaten", () => {
    const url = radarCenterImageUrl(
      "https://tilecache.rainviewer.com",
      "/v2/radar/abc",
      53.1754,
      5.4145,
      6
    );
    assert.equal(
      url,
      "https://tilecache.rainviewer.com/v2/radar/abc/512/6/53.1754/5.4145/2/1_1.png"
    );
  });
});
