import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverlay } from "./useOverlay";

let frames: Map<number, FrameRequestCallback>;
function flushFrame() {
  const pending = [...frames.values()]; frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}
function Overlay({ open }: { open: boolean }) {
  const overlay = useOverlay(open, () => {});
  return overlay.present ? <section ref={overlay.surfaceRef} data-overlay-root="modal" data-state={overlay.state} tabIndex={-1}>Panel</section> : null;
}
beforeEach(() => {
  vi.useFakeTimers(); frames = new Map(); let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  document.documentElement.dataset.reducedMotion = "false";
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); delete document.documentElement.dataset.reducedMotion; });

describe("interruptible overlay presence", () => {
  it("paints the starting pose once and preserves it through a reversed exit", () => {
    const view = render(<Overlay open />);
    const surface = view.container.firstElementChild!;
    expect(surface).not.toHaveAttribute("data-motion-ready");
    flushFrame(); expect(surface).not.toHaveAttribute("data-motion-ready");
    flushFrame(); expect(surface).toHaveAttribute("data-motion-ready");
    view.rerender(<Overlay open={false} />);
    act(() => vi.advanceTimersByTime(90));
    view.rerender(<Overlay open />);
    expect(view.container.firstElementChild).toBe(surface);
    expect(surface).toHaveAttribute("data-motion-ready");
    expect(frames.size).toBe(0);
    act(() => vi.advanceTimersByTime(200));
    expect(surface).toBeInTheDocument();
    view.rerender(<Overlay open={false} />);
    act(() => vi.advanceTimersByTime(180));
    expect(surface).not.toBeInTheDocument();
  });

  it("cancels delayed entry when closed before its first visible frame", () => {
    const view = render(<Overlay open />);
    const surface = view.container.firstElementChild!;
    flushFrame();
    view.rerender(<Overlay open={false} />);
    expect(frames.size).toBe(0);
    flushFrame();
    expect(surface).not.toHaveAttribute("data-motion-ready");
    act(() => vi.advanceTimersByTime(180));
    expect(surface).not.toBeInTheDocument();
  });

  it("makes reduced-motion entry ready immediately and skips exit retention", () => {
    document.documentElement.dataset.reducedMotion = "true";
    const view = render(<Overlay open />);
    expect(view.container.firstElementChild).toHaveAttribute("data-motion-ready");
    expect(frames.size).toBe(0);
    view.rerender(<Overlay open={false} />);
    act(() => vi.advanceTimersByTime(0));
    expect(view.container).toBeEmptyDOMElement();
  });
});
