import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveDataTime, parseLiveTimestamp } from "./live-data-time";
import type { WeerLive } from "@/lib/api/types";

describe("liveDataTime", () => {
  it("prefers newer server_timestamp over older DB row", () => {
    const data: WeerLive = {
      temp_c: 24,
      server_timestamp: "2026-05-22 14:00:00",
    };
    const dbAt = new Date("2026-05-22 12:00:00");
    assert.ok(liveDataTime(data, dbAt) > dbAt.getTime());
  });

  it("parses ISO dateutc", () => {
    assert.ok(parseLiveTimestamp("2026-05-22T12:30:00Z") > 0);
  });
});
