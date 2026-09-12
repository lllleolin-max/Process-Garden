export interface FrameDecision {
  render: boolean;
  alignedTime: number;
}

export function decideAnimationFrame(lastRenderedAt: number, now: number, fps: number): FrameDecision {
  if (!lastRenderedAt) return { render: true, alignedTime: now };
  const interval = 1000 / Math.max(1, Number.isFinite(fps) ? fps : 60);
  const elapsed = now - lastRenderedAt;
  if (elapsed + 0.35 < interval) return { render: false, alignedTime: lastRenderedAt };
  // An early vsync accepted by the tolerance still consumes one interval.
  // Modulo alone would leave the deadline unchanged and render twice.
  const intervals = Math.max(1, Math.floor((elapsed + 0.35) / interval));
  return { render: true, alignedTime: lastRenderedAt + intervals * interval };
}
