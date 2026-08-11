import { CheckCircle2, Save } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import ProbabilityChart from "./ProbabilityChart";
import { formatPercent } from "../../utils/formatters";
import { getPredictionMeta } from "../../utils/scan";

function ProbabilityRow({ label, pcos, normal }) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">{label}</p>
      <ProbabilityChart
        probabilities={{
          pcos: pcos * 100,
          normal: normal * 100,
        }}
      />
    </div>
  );
}

function PredictionResult({ result, onSave, canSave }) {
  // Multimodal shape: { final, clinical, image }
  const isMultimodal = Boolean(result?.final);

  const displayPrediction = isMultimodal
    ? result.final.prediction.toLowerCase()
    : result.prediction;

  const displayConfidence = isMultimodal
    ? result.final.pcos_probability * 100
    : result.confidence;

  const meta = getPredictionMeta(displayPrediction);

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Analysis Complete
          </p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            {meta.summary}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {isMultimodal
              ? "Fused result from clinical data and ultrasound image analysis."
              : "Model confidence and probability breakdown based on ultrasound image analysis."}
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-5 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {isMultimodal ? "PCOS probability" : "Model confidence"}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
            {formatPercent(displayConfidence)}
          </p>
        </div>
      </div>

      {/* Multimodal breakdown */}
      {isMultimodal ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Final fused prediction
              </p>
              <div className="mt-3">
                <ProbabilityChart
                  probabilities={{
                    pcos: result.final.pcos_probability * 100,
                    normal: result.final.normal_probability * 100,
                  }}
                />
              </div>
            </div>
            <div className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Model</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">Multimodal (Clinical + ResNet-50)</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Analysis type</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">Clinical + Ultrasound</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Fusion strategy</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">Equal-weight average</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Threshold</p>
                <p className="mt-1 font-semibold text-[var(--color-foreground)]">{result.final.threshold}</p>
              </div>
            </div>
          </div>

          {/* Individual model results */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ProbabilityRow
              label="Clinical model"
              pcos={result.clinical.pcos_probability}
              normal={result.clinical.normal_probability}
            />
            <ProbabilityRow
              label="Ultrasound image model"
              pcos={result.image.pcos_probability}
              normal={result.image.normal_probability}
            />
          </div>
        </div>
      ) : (
        /* Legacy image-only result */
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
      )}

      <div className="rounded-[24px] border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-900">
        FemWell is an AI-assisted screening tool. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
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
