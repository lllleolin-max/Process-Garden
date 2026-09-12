import { describe, expect, it } from "vitest";
import { removeBlackMatte } from "./spriteAlpha";

describe("generated sprite transparency", () => {
  it("removes black rectangles and feathers dark edges without changing artwork colors", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 6, 4, 3, 255, 7, 5, 2, 255, 80, 240, 120, 255]);
    removeBlackMatte(pixels);
    expect([...pixels]).toEqual([0, 0, 0, 0, 6, 4, 3, 0, 7, 5, 2, 36, 80, 240, 120, 255]);
  });

  it("does not turn transparent or partially transparent source pixels opaque", () => {
    const pixels = new Uint8ClampedArray([255, 255, 255, 0, 80, 240, 120, 128]);
    removeBlackMatte(pixels);
    expect([...pixels]).toEqual([255, 255, 255, 0, 80, 240, 120, 128]);
  });
});
