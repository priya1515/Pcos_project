import { CheckCircle2, Save } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import ProbabilityChart from "./ProbabilityChart";
import { formatPercent } from "../../utils/formatters";
import { getPredictionMeta } from "../../utils/scan";

function PredictionResult({ result, onSave, canSave }) {
  const meta = getPredictionMeta(result.prediction);

  return (
    <Card className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Analysis Complete
          </p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">{meta.summary}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Model confidence and probability breakdown based on ultrasound image analysis.</p>
        </div>
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-5 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">Model confidence</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">{formatPercent(result.confidence)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <div className="mt-5">
            <ProbabilityChart probabilities={result.probabilities} />
          </div>
        </div>
        <div className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Model</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{result.model}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Analysis type</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{result.analysisType}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Status</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">Completed</p>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-900">
        FemWell is an AI-assisted screening tool based on ultrasound image analysis. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onSave} disabled={!canSave}>
          <Save className="h-4 w-4" />
          Save Scan
        </Button>
      </div>
    </Card>
  );
}

export default PredictionResult;
