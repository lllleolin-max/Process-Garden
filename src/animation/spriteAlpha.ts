/** Remove a generated sprite's black matte once at decode, preserving source alpha. */
export function removeBlackMatte(pixels: Uint8ClampedArray) {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const brightness = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    const alpha = brightness < 7 ? 0 : Math.min(255, (brightness - 4) * 12);
    pixels[offset + 3] = Math.round(pixels[offset + 3] * alpha / 255);
  }
}
