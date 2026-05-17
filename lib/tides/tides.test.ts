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
import { parseRwsTideExtremes, type RwsResponse } from "./rws-client";

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

function assertWithinMinutes(actual: string, expected: string, maxMin: number) {
  const diff = Math.abs(minutesFromTijd(actual) - minutesFromTijd(expected));
  assert.ok(
    diff <= maxMin,
    `expected ${expected} ±${maxMin}min, got ${actual} (${diff} min off)`
  );
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

describe("parseRwsTideExtremes (Harlingen RWS fixture)", () => {
  const fixture = JSON.parse(
    readFileSync(join(__dirname, "__fixtures__", "harlingen-rws.json"), "utf8")
  ) as RwsResponse;

  const allowed = new Set(["2026-05-17", "2026-05-18"]);
  const items = parseRwsTideExtremes(fixture, allowed);

  /** Officiële RWS-extremen (Europe/Amsterdam) voor Harlingen Waddenzee. */
  const expected: Array<{
    dagKey: string;
    type: "HW" | "LW";
    tijd: string;
    hoogte: string;
  }> = [
    { dagKey: "2026-05-17", type: "LW", tijd: "05:42", hoogte: "-1.14" },
    { dagKey: "2026-05-17", type: "HW", tijd: "11:04", hoogte: "0.88" },
    { dagKey: "2026-05-17", type: "LW", tijd: "18:06", hoogte: "-1.19" },
    { dagKey: "2026-05-17", type: "HW", tijd: "23:26", hoogte: "0.98" },
    { dagKey: "2026-05-18", type: "LW", tijd: "06:27", hoogte: "-1.12" },
    { dagKey: "2026-05-18", type: "HW", tijd: "11:45", hoogte: "0.95" },
    { dagKey: "2026-05-18", type: "LW", tijd: "18:54", hoogte: "-1.22" },
  ];

  it("returns all HW/LW extremes for two days", () => {
    assert.equal(items.length, expected.length);
  });

  it("matches RWS tide times within 15 minutes", () => {
    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i]!;
      const got = items[i]!;
      assert.equal(got.dagKey, exp.dagKey);
      assert.equal(got.type, exp.type);
      assertWithinMinutes(got.tijd, exp.tijd, 0);
      assert.equal(got.hoogte, exp.hoogte);
    }
  });

  it("differs from Open-Meteo hourly model on the same calendar day", () => {
    const openMeteo = extractExtremes(pointsFromFixture(
      JSON.parse(
        readFileSync(join(__dirname, "__fixtures__", "harlingen-48h.json"), "utf8")
      ) as Fixture
    )).filter((e) => e.dagKey === "2026-05-17");

    const rws = items.filter((e) => e.dagKey === "2026-05-17");
    const firstLwOm = openMeteo.find((e) => e.type === "LW")!.tijd;
    const firstLwRws = rws.find((e) => e.type === "LW")!.tijd;
    const diffMin = Math.abs(
      minutesFromTijd(firstLwOm) - minutesFromTijd(firstLwRws)
    );
    assert.ok(diffMin >= 60, "RWS and Open-Meteo should differ by at least 1 hour");
  });
});

describe("extractExtremes 10-minute resolution", () => {
  it("allows smaller parabolic shift than hourly data", () => {
    const delta = parabolicVertexOffsetHours(1, 0, 1, 5 / 60);
    assert.ok(Math.abs(delta) <= 5 / 60 + 1e-9);
  });
});
