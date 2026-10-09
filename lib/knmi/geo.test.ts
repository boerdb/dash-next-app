import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pointInGeoJsonArea, pointInRing } from "./geo";

describe("pointInRing / pointInGeoJsonArea", () => {
  const square: number[][] = [
    [5, 53],
    [6, 53],
    [6, 54],
    [5, 54],
    [5, 53],
  ];

  it("herkent punt binnen ring", () => {
    assert.equal(pointInRing(5.5, 53.5, square), true);
  });

  it("herkent punt buiten ring", () => {
    assert.equal(pointInRing(4.5, 53.5, square), false);
  });

  it("werkt voor GeoJSON Polygon", () => {
    assert.equal(
      pointInGeoJsonArea(5.4145, 53.1754, {
        type: "Polygon",
        coordinates: [square],
      }),
      true
    );
  });

  it("werkt voor MultiPolygon", () => {
    assert.equal(
      pointInGeoJsonArea(5.5, 53.5, {
        type: "MultiPolygon",
        coordinates: [[square]],
      }),
      true
    );
  });
});
