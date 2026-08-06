import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendColorToState,
  buildHueStateBody,
  canApplyPreset,
  capabilitiesFromType,
} from "./colors.ts";

describe("hue colors", () => {
  it("herkent extended color lamp", () => {
    const cap = capabilitiesFromType("Extended color light");
    assert.equal(cap.color, true);
    assert.equal(cap.ct, true);
  });

  it("zet rood via xy op kleurenlamp", () => {
    const body = buildHueStateBody(
      { on: true, bri: 200, color: "red" },
      { color: true, ct: true },
    );
    assert.deepEqual(body.xy, [0.675, 0.322]);
    assert.equal(body.bri, 200);
  });

  it("warm wit via ct op white ambiance", () => {
    const body = buildHueStateBody(
      { on: true, bri: 100, color: "warm_white" },
      { color: false, ct: true },
    );
    assert.equal(body.ct, 454);
    assert.equal(body.xy, undefined);
  });

  it("slaat rood over op dimbare witte lamp", () => {
    const body: Record<string, unknown> = { on: true, bri: 100 };
    appendColorToState(body, "red", { color: false, ct: false });
    assert.equal(body.xy, undefined);
    assert.equal(canApplyPreset("red", { color: false, ct: false }), false);
  });
});
