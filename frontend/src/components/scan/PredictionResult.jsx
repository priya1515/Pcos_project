import { CheckCircle2, Save } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import ProbabilityChart from "./ProbabilityChart";
import { formatPercent } from "../../utils/formatters";
import { getPredictionMeta } from "../../utils/scan";

function toDataSrc(raw) {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

function PredictionResult({ result, onSave, canSave, originalImageUrl, gradcamUrl }) {
  const isMultimodal = Boolean(result?.final);
  const gradcamSrc = toDataSrc(gradcamUrl);

  const prediction = isMultimodal
    ? result.final.prediction.toLowerCase()
    : result.prediction;

  const pcosPct = isMultimodal
    ? result.final.pcos_probability * 100
    : result.probabilities?.pcos > 1
      ? result.probabilities.pcos
      : (result.probabilities?.pcos ?? 0) * 100;

  const normalPct = isMultimodal
    ? result.final.normal_probability * 100
    : result.probabilities?.normal > 1
      ? result.probabilities.normal
      : (result.probabilities?.normal ?? 0) * 100;

  const meta = getPredictionMeta(prediction);
  const isPcos = prediction === "pcos";

  return (
    <div className="space-y-4">
      {/* ── Result banner ── */}
      <Card className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-l-4 ${isPcos ? "border-l-amber-500" : "border-l-emerald-500"}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isPcos ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Analysis Complete</p>
            <p className="mt-0.5 text-xl font-semibold text-[var(--color-foreground)]">{meta.summary}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-muted-foreground)]">PCOS probability</p>
          <p className={`text-4xl font-bold tracking-tight ${isPcos ? "text-amber-600" : "text-emerald-600"}`}>
            {formatPercent(pcosPct)}
          </p>
        </div>
      </Card>

      {/* ── Probability bars ── */}
      <Card>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          {isMultimodal ? "Fused Probabilities" : "Model Probabilities"}
        </p>
        <ProbabilityChart probabilities={{ pcos: pcosPct, normal: normalPct }} />

        {isMultimodal && (
          <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Clinical model</p>
              <ProbabilityChart probabilities={{
                pcos: result.clinical.pcos_probability * 100,
                normal: result.clinical.normal_probability * 100,
              }} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Image model</p>
              <ProbabilityChart probabilities={{
                pcos: result.image.pcos_probability * 100,
                normal: result.image.normal_probability * 100,
              }} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Grad-CAM ── */}
      {gradcamSrc && (
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Grad-CAM Heatmap</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Regions the model focused on when making its prediction.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Original</p>
              <img
                src={originalImageUrl}
                alt="Original ultrasound"
                className="w-full rounded-2xl border border-[var(--color-border)] object-cover"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Grad-CAM overlay</p>
              <img
                src={gradcamSrc}
                alt="Grad-CAM heatmap"
                className="w-full rounded-2xl border border-[var(--color-border)] object-cover"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Model info + save ── */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Model</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {isMultimodal ? "Multimodal (Clinical + ResNet-50)" : (result.model || "ResNet-50")}
            </p>
          </div>
          {isMultimodal && (
            <>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Fusion</p>
                <p className="font-semibold text-[var(--color-foreground)]">Equal-weight average</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Threshold</p>
                <p className="font-semibold text-[var(--color-foreground)]">{result.final.threshold}</p>
              </div>
            </>
          )}
        </div>
        <Button onClick={onSave} disabled={!canSave} className="shrink-0">
          <Save className="h-4 w-4" />
          Save Scan
        </Button>
      </Card>

      {/* ── Disclaimer ── */}
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-800">
        FemWell is an AI-assisted screening tool. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
      </div>
    </div>
  );
}

export default PredictionResult;
