import { memo, useLayoutEffect, useRef } from "react";
import { useAppStore } from "../stores/appStore";
import { decideAnimationFrame } from "../animation/frameRate";
import { alignPolylinePoints } from "../animation/polylineMorph";

interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  scale?: "auto" | "percent";
}

export const Sparkline = memo(function Sparkline({ values, color = "var(--color-primary)", height = 42, fill = true, scale = "auto" }: SparklineProps) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const fillRef = useRef<SVGPolygonElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const motionDisabled = useAppStore((state) => state.reducedMotion || state.paused || state.displayMode !== "windowed");
  const width = 160;
  // A missing observation breaks continuity; filtering it out would fabricate
  // a connection between samples on opposite sides of the gap.
  let tailStart = values.length;
  while (tailStart > 0 && Number.isFinite(values[tailStart - 1])
    && (scale !== "percent" || (values[tailStart - 1] >= 0 && values[tailStart - 1] <= 100))) tailStart--;
  const samples = values.slice(tailStart);
  const min = scale === "percent" ? 0 : Math.min(...samples);
  const max = scale === "percent" ? 100 : Math.max(...samples);
  const range = Math.max(max - min, 1);
  const coordinates = samples.map((value, index) => [
    samples.length === 1 ? width : (index / (samples.length - 1)) * width,
    height - 4 - ((value - min) / range) * Math.max(0, height - 10)
  ]);
  const points = coordinates.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const displayed = useRef(points);
  const displayedHeight = useRef(height);
  const tip = coordinates.at(-1);

  useLayoutEffect(() => {
    // A newly mounted fill must match the in-flight line, not its final target.
    // Keep this separate from the morph effect so toggling fill never restarts it.
    const current = displayed.current;
    fillRef.current?.setAttribute("points", current ? `0,${height} ${current} ${width},${height}` : "");
  }, [fill, height]);

  useLayoutEffect(() => {
    const draw = (next: string) => {
      displayed.current = next;
      lineRef.current?.setAttribute("points", next);
      fillRef.current?.setAttribute("points", next ? `0,${height} ${next} ${width},${height}` : "");
      const last = next.split(" ").at(-1)?.split(",");
      if (last?.length === 2) {
        tipRef.current?.setAttribute("cx", last[0]);
        tipRef.current?.setAttribute("cy", last[1]);
      }
    };
    // The viewBox changes immediately on resize. Rebase the displayed geometry
    // into its new coordinate system before morphing so it stays in the same
    // relative position instead of jumping or being clipped on the first frame.
    const oldHeight = displayedHeight.current;
    displayedHeight.current = height;
    const start = oldHeight !== height && oldHeight > 0
      ? displayed.current.split(" ").filter(Boolean).map(point => {
        const [x, y] = point.split(",").map(Number);
        return `${x.toFixed(1)},${(y * height / oldHeight).toFixed(1)}`;
      }).join(" ")
      : displayed.current;
    const previous = start.split(" ").map((point) => point.split(",").map(Number));
    const target = points.split(" ").map((point) => point.split(",").map(Number));
    if (!start || !points || start === points || previous.length < 2 || target.length < 2 || motionDisabled || document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      draw(points);
      return;
    }
    const { from, to } = alignPolylinePoints(previous, target);
    let frame = 0;
    let startedAt: number | null = null;
    let lastRenderedAt = 0;
    const animate = (now: number) => {
      if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { draw(points); return; }
      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / 420);
      if (progress === 1) { draw(points); return; }
      const decision = decideAnimationFrame(lastRenderedAt, now, useAppStore.getState().animationFps);
      if (!decision.render && progress < 1) {
        frame = requestAnimationFrame(animate);
        return;
      }
      lastRenderedAt = decision.alignedTime;
      const eased = 1 - (1 - progress) ** 3;
      draw(to.map(([x, y], index) => `${(from[index][0] + (x - from[index][0]) * eased).toFixed(1)},${(from[index][1] + (y - from[index][1]) * eased).toFixed(1)}`).join(" "));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const finishWhenHidden = () => {
      if (document.hidden) { cancelAnimationFrame(frame); draw(points); }
    };
    draw(start);
    frame = requestAnimationFrame(animate);
    document.addEventListener("visibilitychange", finishWhenHidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", finishWhenHidden);
    };
  }, [points, height, motionDisabled]);

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {fill && <polygon ref={fillRef} points={points ? `0,${height} ${points} ${width},${height}` : ""} fill={color} opacity="0.08" />}
      <polyline ref={lineRef} points={points} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {tip && <circle ref={tipRef} className="sparkline-tip" cx={tip[0]} cy={tip[1]} r="2" fill={color} />}
    </svg>
  );
}, (previous, next) => previous.scale === next.scale && previous.color === next.color && previous.height === next.height && previous.fill === next.fill && previous.values.length === next.values.length && previous.values.every((value, index) => Object.is(value, next.values[index])));
