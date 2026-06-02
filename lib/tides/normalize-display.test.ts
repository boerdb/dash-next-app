import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GetijItem } from "@/lib/api/types";
import { dagLabelForKey } from "./day-label";
import { normalizeGetijdenForDisplay } from "./normalize-display";

const items: GetijItem[] = [
  {
    type: "LW",
    tijd: "06:30",
    hoogte: "-1.01",
    dagLabel: "Vandaag",
    dagKey: "2026-06-02",
    at: Date.parse("2026-06-02T06:30:00+02:00"),
  },
  {
    type: "HW",
    tijd: "11:52",
    hoogte: "1.03",
    dagLabel: "Vandaag",
    dagKey: "2026-06-02",
    at: Date.parse("2026-06-02T11:52:00+02:00"),
  },
  {
    type: "LW",
    tijd: "18:59",
    hoogte: "-0.94",
    dagLabel: "Vandaag",
    dagKey: "2026-06-02",
    at: Date.parse("2026-06-02T18:59:00+02:00"),
  },
  {
    type: "HW",
    tijd: "00:04",
    hoogte: "0.75",
    dagLabel: "Morgen",
    dagKey: "2026-06-03",
    at: Date.parse("2026-06-03T00:04:00+02:00"),
  },
  {
    type: "LW",
    tijd: "07:02",
    hoogte: "-1.03",
    dagLabel: "Morgen",
    dagKey: "2026-06-03",
    at: Date.parse("2026-06-03T07:02:00+02:00"),
  },
  {
    type: "HW",
    tijd: "12:26",
    hoogte: "1.05",
    dagLabel: "Morgen",
    dagKey: "2026-06-03",
    at: Date.parse("2026-06-03T12:26:00+02:00"),
  },
];

describe("normalizeGetijdenForDisplay", () => {
  it("toont 3 jun als Vandaag na middernacht (niet meer als Morgen)", () => {
    const now = new Date("2026-06-03T00:40:00+02:00");
    const out = normalizeGetijdenForDisplay(items, now);

    assert.equal(out.length, 3);
    assert.equal(out[0]!.dagLabel, "Vandaag");
    assert.equal(out[0]!.tijd, "00:04");
    assert.equal(out[1]!.tijd, "07:02");
    assert.ok(!out.some((e) => e.dagKey === "2026-06-02"));
    assert.ok(out.every((e) => e.dagKey === "2026-06-03"));
  });

  it("labelt morgen correct op de avond ervoor", () => {
    const now = new Date("2026-06-02T22:00:00+02:00");
    const out = normalizeGetijdenForDisplay(items, now);

    assert.ok(out.some((e) => e.dagKey === "2026-06-02" && e.dagLabel === "Vandaag"));
    assert.ok(out.some((e) => e.dagKey === "2026-06-03" && e.dagLabel === "Morgen"));
  });
});

describe("dagLabelForKey", () => {
  it("gebruikt Amsterdam-kalender voor morgen", () => {
    const now = new Date("2026-06-03T00:10:00+02:00");
    assert.equal(dagLabelForKey("2026-06-03", now), "Vandaag");
    assert.equal(dagLabelForKey("2026-06-04", now), "Morgen");
  });
});
