import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bliksemCountFromWeer,
  bliksemDagSyncFromIngest,
  resolveDailyLightningCount,
} from "./bliksem-dag";

describe("resolveDailyLightningCount", () => {
  it("leest lightning_num", () => {
    assert.equal(resolveDailyLightningCount({ lightning_num: 92 }), 92);
    assert.equal(resolveDailyLightningCount({ lightning_num: 0 }), 0);
  });

  it("undefined zonder veld", () => {
    assert.equal(resolveDailyLightningCount({ temp_c: 20 }), undefined);
  });
});

describe("bliksemDagSyncFromIngest", () => {
  it("archiveert vorige dag bij datumwissel", () => {
    const sync = bliksemDagSyncFromIngest(
      { date_tracked: "2026-06-28", lightning_num: 3 },
      { date_tracked: "2026-06-27", lightning_num: 92 }
    );
    assert.equal(sync.archiveDag, "2026-06-27");
    assert.equal(sync.archiveCount, 92);
    assert.equal(sync.vandaagDag, "2026-06-28");
    assert.equal(sync.vandaagCount, 3);
  });

  it("geen archive zonder vorige dag", () => {
    const sync = bliksemDagSyncFromIngest(
      { date_tracked: "2026-06-27", lightning_num: 5 },
      null
    );
    assert.equal(sync.archiveDag, null);
    assert.equal(sync.vandaagCount, 5);
  });
});

describe("bliksemCountFromWeer", () => {
  it("valt terug op 0", () => {
    assert.equal(bliksemCountFromWeer({}), 0);
  });
});
