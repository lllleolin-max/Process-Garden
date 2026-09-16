type Work = { callback: FrameRequestCallback; cancelled: boolean };
const pending = new Set<Work>();
let frame: number | null = null;

function flush(now: number) {
  frame = null;
  const batch = [...pending];
  pending.clear();
  for (const work of batch) {
    if (work.cancelled) continue;
    try {
      work.callback(now);
    } catch (error) {
      // Preserve independent rAF error reporting: one bad formatter must not
      // prevent all other metric transitions from receiving this frame.
      queueMicrotask(() => { throw error; });
    }
  }
}

/** One browser frame for active metric labels and curves; no idle timer. */
export function requestMetricFrame(callback: FrameRequestCallback): () => void {
  const work: Work = { callback, cancelled: false };
  pending.add(work);
  frame ??= requestAnimationFrame(flush);
  return () => {
    // Also marks work already captured by flush, allowing cancellation by a
    // sibling callback before this work's turn in the same frame.
    work.cancelled = true;
    pending.delete(work);
    if (!pending.size && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}
