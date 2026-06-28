import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bliksemCountFromWeer,
  bliksemDagSyncFromIngest,
  resolveDailyLightningCount,
  resolveDailyLightningStrike,
  shouldPersistBliksemLive,
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

describe("resolveDailyLightningStrike", () => {
  it("wist afstand en tijd bij teller 0", () => {
    const r = resolveDailyLightningStrike({
      date_tracked: "2026-06-29",
      lightning_num: 0,
      lightning_km: 18,
      lightning_time: "2026-06-28 23:45:00",
      wh57batt: "5",
    });
    assert.equal(r.lightning_num, 0);
    assert.equal(r.lightning_km, null);
    assert.equal(r.lightning_time, null);
  });

  it("wist gisteren bij dagwissel zonder teller", () => {
    const r = resolveDailyLightningStrike(
      {
        date_tracked: "2026-06-29",
        wh57batt: "5",
      },
      {
        date_tracked: "2026-06-28",
        lightning_num: 314,
        lightning_km: 22,
        lightning_time: "2026-06-28 20:15:00",
      }
    );
    assert.equal(r.lightning_km, null);
    assert.equal(r.lightning_time, null);
  });

  it("behoudt inslag bij teller > 0", () => {
    const r = resolveDailyLightningStrike({
      date_tracked: "2026-06-29",
      lightning_num: 2,
      lightning_km: 12,
      lightning_time: "2026-06-29 14:30:00",
    });
    assert.equal(r.lightning_km, 12);
    assert.equal(r.lightning_time, "2026-06-29 14:30:00");
  });
});

describe("shouldPersistBliksemLive", () => {
  it("true bij dagwissel om gisteren te archiveren", () => {
    assert.equal(
      shouldPersistBliksemLive(
        { date_tracked: "2026-06-28", lightning_num: 0, wh57batt: "5" },
        { date_tracked: "2026-06-27", lightning_num: 314, wh57batt: "5" }
      ),
      true
    );
  });

  it("false zonder WH57 op beide dagen", () => {
    assert.equal(
      shouldPersistBliksemLive(
        { date_tracked: "2026-06-28" },
        { date_tracked: "2026-06-27" }
      ),
      false
    );
  });
});
