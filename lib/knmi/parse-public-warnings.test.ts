import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseKnmiPublicWarningsJson,
  type KnmiPublicWarningsSnapshot,
} from "./parse-public-warnings";

const fixture = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "__fixtures__", "public-warnings-sample.json"),
    "utf8"
  )
) as KnmiPublicWarningsSnapshot;

/** Harlingen ligt in het gele wind-deel van de sample. */
const HARLINGEN = { latitude: 53.1754, longitude: 5.4145 };

describe("parseKnmiPublicWarningsJson", () => {
  it("negeert test-publicaties (niet als echte waarschuwing tonen)", () => {
    const result = parseKnmiPublicWarningsJson(fixture, {
      ...HARLINGEN,
      now: Date.parse("2026-09-03T16:30:00Z"),
    });
    assert.equal(result.isTestPublication, true);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.maxLevel, 0);
  });

  it("filtert op polygon rond Harlingen bij Actual", () => {
    const operational: KnmiPublicWarningsSnapshot = {
      ...fixture,
      metadata: { ...fixture.metadata, publication_type: "manual" },
      warnings: (fixture.warnings ?? []).map((w) => ({
        ...w,
        operational_status: "Actual",
        status: "active",
        parts: (w.parts ?? []).map((p) => ({
          ...p,
          status: p.status === "expired" ? "expired" : "active",
        })),
      })),
    };

    const result = parseKnmiPublicWarningsJson(operational, {
      ...HARLINGEN,
      locationLabel: "Harlingen",
      now: Date.parse("2026-09-03T16:30:00Z"),
    });

    assert.equal(result.isTestPublication, false);
    assert.ok(result.warnings.length >= 1);
    assert.equal(result.warnings.every((w) => w.phenomenonId === "wind"), true);
    assert.ok(result.warnings.some((w) => w.level === 1));
    assert.ok(
      result.warnings.some((w) =>
        w.areaLabel.toLowerCase().includes("friesland")
      )
    );
    // Regen-polygon rond Den Haag mag Harlingen niet raken.
    assert.equal(
      result.warnings.some((w) => w.phenomenonId === "rain"),
      false
    );
  });

  it("slaat expired delen over", () => {
    const operational: KnmiPublicWarningsSnapshot = {
      metadata: { publication_type: "manual" },
      warnings: [
        {
          phenomenon: "wind",
          warning_type: "warning",
          status: "active",
          operational_status: "Actual",
          texts: { nl: { headline: "Test", description: "Testbeschrijving" } },
          parts: [
            {
              color: "orange",
              status: "expired",
              onset: "2026-09-03T14:00:00Z",
              expires: "2026-09-03T15:00:00Z",
              area: {
                type: "Polygon",
                coordinates: [
                  [
                    [5, 53],
                    [6, 53],
                    [6, 54],
                    [5, 54],
                    [5, 53],
                  ],
                ],
              },
              area_description: { nl: "Harlingen" },
            },
          ],
        },
      ],
    };

    const result = parseKnmiPublicWarningsJson(operational, {
      ...HARLINGEN,
      now: Date.parse("2026-09-03T16:30:00Z"),
    });
    assert.equal(result.warnings.length, 0);
  });
});
