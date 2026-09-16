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
  return overlay.present ? <section ref={overlay.surfaceRef} data-overlay-root="modal" data-state={overlay.state} inert={!open} aria-hidden={!open} tabIndex={-1}>Panel</section> : null;
}
beforeEach(() => {
  vi.useFakeTimers(); frames = new Map(); let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  document.documentElement.dataset.reducedMotion = "false";
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); delete document.documentElement.dataset.reducedMotion; });

describe("interruptible overlay presence", () => {
  it("survives repeated reversals without stale timers hiding the final open surface", () => {
    const view = render(<Overlay open />);
    const surface = view.container.firstElementChild!;
    flushFrame(); flushFrame();
    for (let cycle = 0; cycle < 40; cycle++) {
      view.rerender(<Overlay open={false} />);
      expect(surface).toHaveAttribute("inert");
      act(() => vi.advanceTimersByTime(40));
      view.rerender(<Overlay open />);
      expect(surface).not.toHaveAttribute("inert");
      expect(view.container.firstElementChild).toBe(surface);
      expect(frames.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    }
    act(() => vi.advanceTimersByTime(1000));
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveFocus();
    view.unmount();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("can close while animation callbacks are suspended and start a fresh entry later", () => {
    const view = render(<Overlay open />);
    const oldSurface = view.container.firstElementChild!;
    // Model a background tab whose RAF callbacks are not being delivered.
    act(() => vi.advanceTimersByTime(60_000));
    expect(oldSurface).not.toHaveAttribute("data-motion-ready");
    view.rerender(<Overlay open={false} />);
    expect(frames.size).toBe(0);
    act(() => vi.advanceTimersByTime(180));
    expect(oldSurface).not.toBeInTheDocument();
    view.rerender(<Overlay open />);
    const fresh = view.container.firstElementChild!;
    expect(fresh).not.toBe(oldSurface);
    flushFrame(); flushFrame();
    expect(fresh).toHaveAttribute("data-motion-ready");
    expect(oldSurface).not.toHaveAttribute("data-motion-ready");
  });

  it("releases background blocking on unmount while preserving pre-existing inert state", () => {
    const view = render(<div><button data-testid="background">Background</button><aside inert data-testid="already-inert" /><Overlay open /></div>);
    const background = view.getByTestId("background"), alreadyInert = view.getByTestId("already-inert");
    expect(background).toHaveAttribute("inert");
    view.rerender(<div><button data-testid="background">Background</button><aside inert data-testid="already-inert" /></div>);
    expect(background).not.toHaveAttribute("inert");
    expect(alreadyInert).toHaveAttribute("inert");
    expect(frames.size).toBe(0);
    // Flush the DOM's zero-delay focus/selection notifications before checking
    // that no delayed entry/exit work survives the component.
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);
  });

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
