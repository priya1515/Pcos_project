import Card from "../common/Card";
import { formatPercent, formatShortDate } from "../../utils/formatters";

function ComparisonColumn({ scan }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-sm text-[var(--color-muted-foreground)]">{scan.id}</p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{formatShortDate(scan.createdAt)}</p>
      <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-slate-100">
        <img src={scan.imageDataUrl} alt={`Ultrasound for ${scan.id}`} className="h-56 w-full object-cover" />
      </div>
      <p className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">{scan.predictionLabel}</p>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{formatPercent(scan.confidence)} confidence</p>
    </div>
  );
}

function ScanComparison({ scans }) {
  const [first, second] = scans;
  const confidenceChange = second ? second.confidence - first.confidence : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ComparisonColumn scan={first} />
        <ComparisonColumn scan={second} />
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Comparison summary</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">Confidence change</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
              {confidenceChange >= 0 ? "+" : ""}
              {confidenceChange.toFixed(2)} percentage points
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">Prediction</p>
            <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">
              {first.predictionLabel} → {second.predictionLabel}
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
          This comparison summarizes saved model outputs only. It should not be interpreted as evidence of clinical progression without broader longitudinal context.
        </p>
      </Card>
    </div>
  );
}

export default ScanComparison;
