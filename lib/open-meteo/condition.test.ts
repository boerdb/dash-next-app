import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  conditionFromOpenMeteo,
  conditionFromShortwaveRadiation,
} from "./condition";

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

  it("corrigeert te pessimistische bewolking met instraling", () => {
    assert.equal(conditionFromOpenMeteo(3, 100, 719), "sunny");
    assert.equal(conditionFromOpenMeteo(3, 100, 400), "partly-cloudy");
    assert.equal(conditionFromOpenMeteo(3, 100, 100), "cloudy");
  });
});

describe("conditionFromShortwaveRadiation", () => {
  it("classificeert op basis van W/m²", () => {
    assert.equal(conditionFromShortwaveRadiation(719), "sunny");
    assert.equal(conditionFromShortwaveRadiation(400), "partly-cloudy");
    assert.equal(conditionFromShortwaveRadiation(100), "cloudy");
  });
});
