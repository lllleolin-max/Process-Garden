import { expect, it } from "vitest";
import { alignPolylinePoints } from "./polylineMorph";

it("preserves every old and new bend when sample counts change", () => {
  const result = alignPolylinePoints([[0, 10], [80, 0], [160, 10]], [[0, 0], [40, 10], [120, 10], [160, 0]]);
  expect(result.from).toEqual([[0, 10], [40, 5], [80, 0], [120, 5], [160, 10]]);
  expect(result.to).toEqual([[0, 0], [40, 10], [80, 10], [120, 10], [160, 0]]);
});

it("does not change already aligned vertices", () => {
  const from = [[0, 1], [80, 3], [160, 2]], to = [[0, 4], [80, 0], [160, 9]];
  expect(alignPolylinePoints(from, to)).toEqual({ from, to });
});
