import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { conditionFromOpenMeteo } from "./condition";

describe("conditionFromOpenMeteo", () => {
  it("helder en deels bewolkt", () => {
    assert.equal(conditionFromOpenMeteo(0, 5), "sunny");
    assert.equal(conditionFromOpenMeteo(2, 40), "partly-cloudy");
    assert.equal(conditionFromOpenMeteo(3, 90), "cloudy");
  });

  it("valt terug op bewolking percentage", () => {
    assert.equal(conditionFromOpenMeteo(4, 10), "sunny");
    assert.equal(conditionFromOpenMeteo(4, 50), "partly-cloudy");
  });
});
