import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clearKnmiResultCache, fetchKnmiWaarschuwingen } from "./fetch-warnings";
import { KNMI_CUTOVER_AT } from "./constants";

const legacyXml = readFileSync(
  join(import.meta.dirname, "__fixtures__", "waarschuwing-fr-onweer.xml"),
  "utf8"
);

const heartbeat = {
  metadata: { publication_type: "heartbeat", generated_at: "2026-10-23T05:30:03Z" },
  warnings: [],
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  clearKnmiResultCache();
});

/** Nep-KNMI: bestandslijsten, download-URL's en de bestanden zelf. */
function mockKnmi(opts: { legacyModified: string; publicSnapshot?: object; publicFails?: boolean }) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.includes("KNMI-public-weather-warnings")) {
      if (opts.publicFails) return new Response("{}", { status: 500 });
      if (url.includes("/files?")) {
        return json({ files: [{ filename: "public.json", lastModified: "2026-11-02T05:30:00Z" }] });
      }
      return json({ temporaryDownloadUrl: "https://download/public.json" });
    }
    if (url.includes("waarschuwingen_nederland_48h")) {
      if (url.includes("/files?")) {
        return json({ files: [{ filename: "legacy.xml", lastModified: opts.legacyModified }] });
      }
      return json({ temporaryDownloadUrl: "https://download/legacy.xml" });
    }
    if (url === "https://download/public.json") return json(opts.publicSnapshot ?? heartbeat);
    if (url === "https://download/legacy.xml") return new Response(legacyXml, { status: 200 });
    throw new Error(`onverwachte url ${url}`);
  }) as typeof fetch;
  return calls;
}

describe("fetchKnmiWaarschuwingen · bronkeuze rond de cutover", () => {
  it("gebruikt vóór 2 nov de provincie-XML, ook als de nieuwe dataset een heartbeat heeft", async () => {
    const calls = mockKnmi({ legacyModified: "2026-10-23T14:00:00Z" });
    const now = Date.parse("2026-10-23T16:00:00+02:00");
    const result = await fetchKnmiWaarschuwingen("key", "FR", now);
    assert.equal(result.source, "legacy-province");
    assert.equal(result.warnings.length, 1);
    assert.ok(!calls.some((u) => u.includes("KNMI-public-weather-warnings")));
  });

  it("gebruikt vanaf 2 nov de nieuwe dataset", async () => {
    mockKnmi({ legacyModified: "2026-11-01T22:00:00Z" });
    const result = await fetchKnmiWaarschuwingen("key", "FR", KNMI_CUTOVER_AT + 6 * 3_600_000);
    assert.equal(result.source, "public-local");
    assert.equal(result.maxLevel, 0);
  });

  it("valt na de cutover alleen terug op een recente provincie-XML", async () => {
    mockKnmi({ legacyModified: "2026-11-02T03:00:00Z", publicFails: true });
    const fresh = await fetchKnmiWaarschuwingen("key", "FR", KNMI_CUTOVER_AT + 4 * 3_600_000);
    assert.equal(fresh.source, "legacy-province");
    clearKnmiResultCache();

    mockKnmi({ legacyModified: "2026-11-01T22:00:00Z", publicFails: true });
    await assert.rejects(
      fetchKnmiWaarschuwingen("key", "FR", KNMI_CUTOVER_AT + 3 * 86_400_000)
    );
  });
});
