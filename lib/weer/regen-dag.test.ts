import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { regenDagSyncFromIngest, regenMmFromWeer } from "./regen-dag";
import {
  jaarNavigatie,
  maandLabelShort,
  parseJaar,
  round1,
} from "./regen-jaar-labels";

describe("regenMmFromWeer", () => {
  it("leest dailyrain_mm", () => {
    assert.equal(regenMmFromWeer({ dailyrain_mm: 12.34 }), 12.3);
  });

  it("prefereert WS90 piezo boven legacy WH65-velden", () => {
    assert.equal(
      regenMmFromWeer({
        dailyrain_mm: 0.6,
        dailyrain_piezo_mm: 0.6,
      }),
      0.6
    );
  });
});

describe("regenDagSyncFromIngest", () => {
  it("archiveert vorige dag bij datumwissel", () => {
    const sync = regenDagSyncFromIngest(
      { date_tracked: "2026-06-05", dailyrain_mm: 1.2 },
      { date_tracked: "2026-06-04", dailyrain_mm: 8.5 }
    );
    assert.equal(sync.archiveDag, "2026-06-04");
    assert.equal(sync.archiveMm, 8.5);
    assert.equal(sync.vandaagDag, "2026-06-05");
    assert.equal(sync.vandaagMm, 1.2);
  });

  it("geen archive zonder vorige dag", () => {
    const sync = regenDagSyncFromIngest(
      { date_tracked: "2026-06-05", dailyrain_mm: 2 },
      null
    );
    assert.equal(sync.archiveDag, null);
    assert.equal(sync.vandaagMm, 2);
  });
});

describe("regen-jaar-labels", () => {
  it("parseJaar accepteert 2026", () => {
    assert.equal(parseJaar("2026"), 2026);
  });

  it("maandLabelShort", () => {
    assert.equal(maandLabelShort(3), "mrt");
  });

  it("jaarNavigatie", () => {
    const nav = jaarNavigatie(2026);
    assert.equal(typeof nav.kan_vorige_jaar, "boolean");
    assert.equal(typeof nav.kan_volgende_jaar, "boolean");
  });

  it("round1", () => {
    assert.equal(round1(1.26), 1.3);
  });
});
