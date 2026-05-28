import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseKnmiWarningsXml } from "./parse-warnings";

const fixture = readFileSync(
  join(import.meta.dirname, "__fixtures__", "waarschuwing-fr-onweer.xml"),
  "utf8"
);

describe("parseKnmiWarningsXml", () => {
  it("leest alleen waarschuwingen voor de opgegeven provincie", () => {
    const result = parseKnmiWarningsXml(fixture, "FR");

    assert.equal(result.maxLevel, 1);
    assert.equal(result.maxLevelLabel, "Code geel");
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].phenomenonLabel, "Onweersbuien");
    assert.equal(result.warnings[0].level, 1);
    assert.ok(result.warnings[0].texts[0]?.includes("Onweersbuien"));
    assert.ok(result.warnings[0].validFrom.includes("29"));
    assert.ok(result.warnings[0].validTo.includes("13"));
  });

  it("geeft geen waarschuwingen bij lege of geen match", () => {
    const empty = parseKnmiWarningsXml("<root><data><cube></cube></data></root>", "FR");
    assert.equal(empty.maxLevel, 0);
    assert.equal(empty.warnings.length, 0);
  });
});
