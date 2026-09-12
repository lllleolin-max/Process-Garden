import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  values: number[];
  color?: string;
  progress?: number;
}

export function MetricCard({ label, value, detail, icon: Icon, values, color, progress }: MetricCardProps) {
  return (
    <section className="metric-card">
      <div className="metric-heading">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span>
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {progress !== undefined ? (
        <div className="progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0, Math.min(Number.isFinite(progress) ? progress : 0, 100)) / 100})`, background: color }} /></div>
      ) : (
        <Sparkline values={values} color={color} height={34} />
      )}
      <div className="metric-detail">{detail}</div>
    </section>
  );
}
