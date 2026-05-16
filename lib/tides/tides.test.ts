import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseOpenMeteoLocalTime } from "./parse-open-meteo-time";
import {
  extractExtremes,
  parabolicVertexOffsetHours,
  type TidePoint,
} from "./extract-extremes";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Fixture {
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    sea_level_height_msl: number[];
  };
}

function amsterdamTime(d: Date): string {
  return d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function minutesFromTijd(tijd: string): number {
  const [h, m] = tijd.split(":").map(Number);
  return h * 60 + m;
}

function pointsFromFixture(fixture: Fixture): TidePoint[] {
  const offset = fixture.utc_offset_seconds;
  return fixture.hourly.time.map((iso, i) => ({
    time: parseOpenMeteoLocalTime(iso, offset),
    heightM: fixture.hourly.sea_level_height_msl[i],
  }));
}

describe("parseOpenMeteoLocalTime", () => {
  it("interprets API local time as Europe/Amsterdam, not server local", () => {
    const d = parseOpenMeteoLocalTime("2026-05-17T03:00", 7200);
    assert.equal(amsterdamTime(d), "03:00");
  });
});

describe("parabolicVertexOffsetHours", () => {
  it("returns negative offset before a minimum", () => {
    const delta = parabolicVertexOffsetHours(-1.52, -1.56, -0.91);
    assert.ok(delta < 0 && delta >= -0.5);
  });
});

describe("extractExtremes with Harlingen fixture", () => {
  const fixture = JSON.parse(
    readFileSync(join(__dirname, "__fixtures__", "harlingen-48h.json"), "utf8")
  ) as Fixture;

  const extremes = extractExtremes(pointsFromFixture(fixture));

  it("does not show identical :00 times for today and tomorrow LW/HW", () => {
    const today = extremes.filter((e) => e.dagKey === "2026-05-17");
    const tomorrow = extremes.filter((e) => e.dagKey === "2026-05-18");

    assert.ok(today.length >= 2 && tomorrow.length >= 2);

    const todayLw = today.find((e) => e.type === "LW")!;
    const tomorrowLw = tomorrow.find((e) => e.type === "LW")!;
    const todayHw = today.find((e) => e.type === "HW")!;
    const tomorrowHw = tomorrow.find((e) => e.type === "HW")!;

    assert.notEqual(
      `${todayLw.tijd}-${todayHw.tijd}`,
      `${tomorrowLw.tijd}-${tomorrowHw.tijd}`,
      "LW/HW clock times should differ between days"
    );

    assert.notEqual(todayLw.tijd, "05:00");
    assert.notEqual(todayHw.tijd, "11:00");
  });

  it("shifts tomorrow LW/HW at least 30 minutes later than today", () => {
    const today = extremes.filter((e) => e.dagKey === "2026-05-17");
    const tomorrow = extremes.filter((e) => e.dagKey === "2026-05-18");

    const todayLwMin = minutesFromTijd(today.find((e) => e.type === "LW")!.tijd);
    const tomorrowLwMin = minutesFromTijd(
      tomorrow.find((e) => e.type === "LW")!.tijd
    );
    const todayHwMin = minutesFromTijd(today.find((e) => e.type === "HW")!.tijd);
    const tomorrowHwMin = minutesFromTijd(
      tomorrow.find((e) => e.type === "HW")!.tijd
    );

    assert.ok(tomorrowLwMin - todayLwMin >= 30);
    assert.ok(tomorrowHwMin - todayHwMin >= 30);
  });

  it("includes sub-hour precision in tide times", () => {
    const hasMinutes = extremes.some((e) => {
      const mins = minutesFromTijd(e.tijd);
      return mins % 60 !== 0;
    });
    assert.ok(hasMinutes, "expected at least one tide time not on the hour");
  });
});
