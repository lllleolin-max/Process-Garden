import { useLayoutEffect, useRef } from "react";
import { decideAnimationFrame } from "../animation/frameRate";
import { useAppStore } from "../stores/appStore";

export function AnimatedMetric({ value, format }: { value: number; format: (value: number) => string }) {
  const node = useRef<HTMLSpanElement>(null);
  const displayed = useRef(value);
  const disabled = useAppStore(s => s.paused || s.reducedMotion || s.displayMode !== "windowed");
  useLayoutEffect(() => {
    const draw = (next: number) => {
      displayed.current = next;
      if (node.current) node.current.textContent = Number.isFinite(next) ? format(next) : "—";
    };
    const from = displayed.current;
    if (disabled || document.hidden || !Number.isFinite(from) || !Number.isFinite(value)
      || from === value || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      draw(value); return;
    }
    let frame = 0, start: number | null = null, last = 0;
    const animate = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / 320);
      if (progress === 1 || document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { draw(value); return; }
      const decision = decideAnimationFrame(last, now, useAppStore.getState().animationFps);
      if (decision.render) {
        last = decision.alignedTime;
        draw(from + (value - from) * (1 - (1 - progress) ** 3));
      }
      frame = requestAnimationFrame(animate);
    };
    const hide = () => { if (document.hidden) { cancelAnimationFrame(frame); draw(value); } };
    draw(from);
    frame = requestAnimationFrame(animate);
    document.addEventListener("visibilitychange", hide);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", hide); };
  }, [value, format, disabled]);
  const label = Number.isFinite(value) ? format(value) : "—";
  // Assistive technology receives the real observation, not intermediate frames.
  return <span aria-label={label}><span aria-hidden="true" ref={node}>{label}</span></span>;
}
