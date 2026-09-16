type Point = number[];

/** Keep every bend in both curves so adding samples does not erase an old peak. */
export function alignPolylinePoints(from: Point[], to: Point[]) {
  const xs = [...new Set([...from, ...to].map(([x]) => x))].sort((a, b) => a - b);
  const sample = (points: Point[]) => {
    let segment = 0;
    return xs.map(x => {
      while (segment < points.length - 2 && points[segment + 1][0] < x) segment++;
      const [leftX, leftY] = points[segment];
      const [rightX, rightY] = points[segment + 1];
      const fraction = Math.max(0, Math.min(1, (x - leftX) / (rightX - leftX)));
      return [x, leftY + (rightY - leftY) * fraction];
    });
  };
  return { from: sample(from), to: sample(to) };
}
