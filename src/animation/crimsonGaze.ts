export interface GazePoint { x: number; y: number }

export function gazeTarget(pointer: GazePoint | null, center: GazePoint, radius: number): GazePoint {
  if (!pointer) return { x: 0, y: 0 };
  const x = (pointer.x - center.x) / Math.max(1, radius * 4);
  const y = (pointer.y - center.y) / Math.max(1, radius * 4);
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length };
}

// Eye bounds measured from the generated crimson core, in normalized coordinates.
// Keep patch borders fixed: only the inner iris moves, not the armor silhouette.
const eyes = [
  [0.25, 0.305, 0.485, 0.27],
  [0.44, 0.08, 0.102, 0.068],
  [0.275, 0.161, 0.065, 0.04],
  [0.65, 0.163, 0.065, 0.04],
  [0.16, 0.278, 0.036, 0.032],
  [0.801, 0.278, 0.035, 0.032]
];

/** Deform the existing generated pixels; never paint replacement pupils. */
export function paintCrimsonGaze(source: HTMLCanvasElement, output: HTMLCanvasElement, gaze: GazePoint) {
  const context = output.getContext("2d");
  if (!context) return source;
  const size = output.width;
  context.clearRect(0, 0, size, size);
  context.drawImage(source, 0, 0, size, size);
  for (const [x, y, width, height] of eyes) {
    const sx = [x, x + width * 0.4, x + width * 0.6, x + width];
    const sy = [y, y + height * 0.32, y + height * 0.68, y + height];
    const dx = sx.map((v, i) => (v + (i === 1 || i === 2 ? gaze.x * width * 0.17 : 0)) * size);
    const dy = sy.map((v, i) => (v + (i === 1 || i === 2 ? gaze.y * height * 0.12 : 0)) * size);
    context.clearRect(x * size, y * size, width * size, height * size);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      context.drawImage(source, sx[col] * source.width, sy[row] * source.height,
        (sx[col + 1] - sx[col]) * source.width, (sy[row + 1] - sy[row]) * source.height,
        dx[col], dy[row], dx[col + 1] - dx[col], dy[row + 1] - dy[row]);
    }
  }
  return output;
}
