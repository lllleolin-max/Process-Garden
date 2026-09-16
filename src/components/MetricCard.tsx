import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { AnimatedMetric } from "./AnimatedMetric";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  values: number[];
  color?: string;
  progress?: number;
  hint?: string;
  animatedValue?: number;
  formatValue?: (value: number) => string;
  percentScale?: boolean;
}

export function MetricCard({ label, value, detail, icon: Icon, values, color, progress, hint, animatedValue, formatValue, percentScale }: MetricCardProps) {
  return (
    <section className="metric-card" aria-label={label} title={hint}>
      <div className="metric-heading">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span>
        <span>{label}</span>
      </div>
      <div className="metric-value">{animatedValue !== undefined && formatValue ? <AnimatedMetric value={animatedValue} format={formatValue} /> : value}</div>
      {progress !== undefined ? (
        <div className="progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0, Math.min(Number.isFinite(progress) ? progress : 0, 100)) / 100})`, background: color }} /></div>
      ) : (
        <Sparkline values={values} color={color} height={34} scale={percentScale ? "percent" : "auto"} />
      )}
      <div className="metric-detail">{detail}</div>
    </section>
  );
}
