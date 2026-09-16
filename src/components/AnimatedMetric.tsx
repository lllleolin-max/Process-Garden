import { useLayoutEffect, useRef } from "react";
import { decideAnimationFrame } from "../animation/frameRate";
import { useAppStore } from "../stores/appStore";
import "./AnimatedMetric.css";

export function AnimatedMetric({ value, format, active = true }: { value: number; format: (value: number) => string; active?: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  const displayed = useRef(value);
  const collector = useAppStore(s => s.collector);
  const previousCollector = useRef(collector);
  const disabled = useAppStore(s => s.paused || s.reducedMotion || s.displayMode !== "windowed");
  useLayoutEffect(() => {
    const draw = (next: number) => {
      displayed.current = next;
      const text = Number.isFinite(next) ? format(next) : "—";
      if (node.current && node.current.textContent !== text) node.current.textContent = text;
    };
    const from = displayed.current;
    const changedSource = previousCollector.current !== collector;
    previousCollector.current = collector;
    if (!active || changedSource || disabled || document.hidden || !Number.isFinite(from) || !Number.isFinite(value)
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
  }, [value, format, active, disabled, collector]);
  const label = Number.isFinite(value) ? format(value) : "—";
  // Assistive technology receives the real observation, not intermediate frames.
  return <span><span className="animated-metric-observation">{label}</span><span aria-hidden="true" ref={node}>{label}</span></span>;
}
