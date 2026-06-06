import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDaylightDuration, getAstronomyInfo } from "./sun-moon";

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
});
