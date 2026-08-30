import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amsterdamCivilNoon,
  formatDaylightDuration,
  getAstronomyInfo,
} from "./sun-moon";
import { HARLINGEN } from "@/lib/location";

describe("formatDaylightDuration", () => {
  it("formatteert uren en minuten", () => {
    const sunrise = new Date("2026-06-05T03:42:00Z");
    const sunset = new Date("2026-06-05T19:10:00Z");
    assert.equal(formatDaylightDuration(sunrise, sunset), "15u 28m");
  });

  it("rondt hele uren af", () => {
    const sunrise = new Date("2026-01-01T08:00:00Z");
    const sunset = new Date("2026-01-01T16:00:00Z");
    assert.equal(formatDaylightDuration(sunrise, sunset), "8 uur");
  });

  it("komt overeen met getoonde zonop/-onder tijden", () => {
    const info = getAstronomyInfo(new Date("2026-06-06T12:00:00+02:00"));
    const parse = (label: string) => {
      const [h, m] = label.split(/[.:]/).map(Number);
      return h * 60 + m;
    };
    const expectedMin = parse(info.sunsetLabel) - parse(info.sunriseLabel);
    const match = info.daylightHoursLabel.match(/^(\d+)(?:u (\d+)m| uur)$/);
    assert.ok(match);
    const h = Number(match[1]);
    const m = match[2] ? Number(match[2]) : 0;
    assert.equal(h * 60 + m, expectedMin);
  });
});

describe("getAstronomyInfo", () => {
  it("levert daylightHoursLabel", () => {
    const info = getAstronomyInfo(new Date("2026-06-05T12:00:00+02:00"));
    assert.match(info.daylightHoursLabel, /\d/u);
    assert.match(info.daylightHoursLabel, /(uur|u \d+m)/);
  });

  it("levert maanopkomst- en onderganglabels", () => {
    const info = getAstronomyInfo(new Date("2026-07-28T22:00:00+02:00"));
    assert.ok(info.moon.riseLabel === null || /^\d{2}:\d{2}$/.test(info.moon.riseLabel));
    assert.ok(info.moon.setLabel === null || /^\d{2}:\d{2}$/.test(info.moon.setLabel));
    assert.ok(info.moon.riseLabel != null || info.moon.setLabel != null);
  });

  it("gebruikt de Amsterdamse dag na middernacht, niet UTC", () => {
    const afterMidnight = getAstronomyInfo(
      new Date("2026-08-31T00:14:00+02:00")
    );
    const noonSameDay = getAstronomyInfo(
      new Date("2026-08-31T12:00:00+02:00")
    );
    const eveningBefore = getAstronomyInfo(
      new Date("2026-08-30T23:30:00+02:00")
    );
    assert.equal(afterMidnight.sunriseLabel, noonSameDay.sunriseLabel);
    assert.equal(afterMidnight.sunsetLabel, noonSameDay.sunsetLabel);
    assert.notEqual(afterMidnight.sunriseLabel, eveningBefore.sunriseLabel);
  });

  it("doet hetzelfde in de winter (CET, tot 01:00 UTC-dag)", () => {
    const afterMidnight = getAstronomyInfo(
      new Date("2026-01-15T00:30:00+01:00")
    );
    const noonSameDay = getAstronomyInfo(
      new Date("2026-01-15T12:00:00+01:00")
    );
    assert.equal(afterMidnight.sunriseLabel, noonSameDay.sunriseLabel);
    assert.equal(afterMidnight.sunsetLabel, noonSameDay.sunsetLabel);
  });

  it("rekent tijden voor Harlingen, niet Greenwich", () => {
    const at = new Date("2026-08-31T12:00:00+02:00");
    const harlingen = getAstronomyInfo(at, HARLINGEN.latitude, HARLINGEN.longitude);
    const greenwich = getAstronomyInfo(at, HARLINGEN.latitude, 0);
    assert.notEqual(harlingen.sunriseLabel, greenwich.sunriseLabel);
    assert.equal(harlingen.sunrise.toISOString().slice(0, 10), "2026-08-31");
  });
});

describe("amsterdamCivilNoon", () => {
  it("valt op 12:00 Amsterdam, ook vlak na middernacht", () => {
    const noon = amsterdamCivilNoon(new Date("2026-08-31T00:14:00+02:00"));
    const label = noon.toLocaleString("sv-SE", {
      timeZone: "Europe/Amsterdam",
      hour12: false,
    });
    assert.equal(label, "2026-08-31 12:00:00");
  });
});
