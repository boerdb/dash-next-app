import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  previousAmsterdamDate,
  regenDagSyncFromIngest,
  regenMmFromWeer,
  todayRainMmAfterDayChange,
  correctStaleTodayRainFromYesterday,
} from "./regen-dag";
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

  it("leest dailyrain_mm (WH40 of piezo-primair)", () => {
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

  it("negeert niet-geresette teller na middernacht", () => {
    const sync = regenDagSyncFromIngest(
      { date_tracked: "2026-09-01", dailyrain_mm: 11.7 },
      { date_tracked: "2026-08-31", dailyrain_mm: 11.7 }
    );
    assert.equal(sync.archiveDag, "2026-08-31");
    assert.equal(sync.archiveMm, 11.7);
    assert.equal(sync.vandaagDag, "2026-09-01");
    assert.equal(sync.vandaagMm, 0);
  });

  it("telt regen na middernacht zonder reset als delta", () => {
    const sync = regenDagSyncFromIngest(
      { date_tracked: "2026-09-01", dailyrain_mm: 13.7 },
      { date_tracked: "2026-08-31", dailyrain_mm: 11.7 }
    );
    assert.equal(sync.vandaagMm, 2);
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

describe("todayRainMmAfterDayChange", () => {
  it("geeft 0 bij ongewijzigde teller na middernacht", () => {
    assert.equal(
      todayRainMmAfterDayChange(
        { date_tracked: "2026-09-01", dailyrain_mm: 11.7 },
        { date_tracked: "2026-08-31", dailyrain_mm: 11.7 }
      ),
      0
    );
  });

  it("gebruikt geresette teller direct", () => {
    assert.equal(
      todayRainMmAfterDayChange(
        { date_tracked: "2026-09-01", dailyrain_mm: 2.4 },
        { date_tracked: "2026-08-31", dailyrain_mm: 11.7 }
      ),
      2.4
    );
  });
});

describe("correctStaleTodayRainFromYesterday", () => {
  it("corrigeert live-cache met gisteren uit DB", () => {
    assert.equal(
      correctStaleTodayRainFromYesterday(
        { date_tracked: "2026-09-01", dailyrain_mm: 11.7 },
        11.7
      ),
      0
    );
  });

  it("laat echte regen vandaag ongemoeid", () => {
    assert.equal(
      correctStaleTodayRainFromYesterday(
        { date_tracked: "2026-09-05", dailyrain_mm: 20 },
        0.5
      ),
      20
    );
  });
});

describe("previousAmsterdamDate", () => {
  it("geeft vorige kalenderdag", () => {
    assert.equal(previousAmsterdamDate("2026-09-01"), "2026-08-31");
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
