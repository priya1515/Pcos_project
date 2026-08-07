import { formatPercent } from "../../utils/formatters";

function ProbabilityBar({ label, value, toneClass }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--color-foreground)]">{label}</span>
        <span className="text-[var(--color-muted-foreground)]">{formatPercent(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${toneClass}`} style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

function ProbabilityChart({ probabilities }) {
  return (
    <div className="space-y-4">
      <ProbabilityBar label="PCOS" value={probabilities.pcos} toneClass="bg-amber-500" />
      <ProbabilityBar label="Normal" value={probabilities.normal} toneClass="bg-emerald-500" />
    </div>
  );
}

export default ProbabilityChart;
