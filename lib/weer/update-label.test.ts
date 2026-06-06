import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatWeerUpdateLabel } from "./update-label";

describe("formatWeerUpdateLabel", () => {
  it("toont alleen tijd als timestamp vandaag is (Amsterdam)", () => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Amsterdam",
    });
    const label = formatWeerUpdateLabel(`${today} 14:32:00`);
    assert.ok(label?.startsWith("Bijgewerkt: "));
    assert.match(label ?? "", /14:32/);
    assert.doesNotMatch(label ?? "", /jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec/i);
  });

  it("toont datum en tijd voor oudere metingen", () => {
    const label = formatWeerUpdateLabel("2026-01-15 09:05:00");
    assert.ok(label?.includes("15"));
    assert.ok(label?.includes("09:05") || label?.includes("9:05"));
  });

  it("geeft undefined bij ontbrekende of ongeldige timestamp", () => {
    assert.equal(formatWeerUpdateLabel(undefined), undefined);
    assert.equal(formatWeerUpdateLabel(""), undefined);
    assert.equal(formatWeerUpdateLabel("invalid"), undefined);
  });
});
