import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amsterdamSqlOffset } from "@/lib/energie/amsterdam-sql-offset";

describe("amsterdamSqlOffset", () => {
  it("geeft +02:00 in zomer (CEST)", () => {
    const offset = amsterdamSqlOffset(new Date("2026-05-22T12:00:00Z"));
    assert.equal(offset, "+02:00");
  });

  it("geeft +01:00 in winter (CET)", () => {
    const offset = amsterdamSqlOffset(new Date("2026-01-15T12:00:00Z"));
    assert.equal(offset, "+01:00");
  });
});
