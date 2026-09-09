import { Activity, AlertTriangle, CheckCircle2, Heart, Save } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import ProbabilityChart from "./ProbabilityChart";
import { formatPercent } from "../../utils/formatters";
import { getPredictionMeta } from "../../utils/scan";
import { generateRecommendations, getRiskLabel } from "../../utils/recommendations";

function toDataSrc(raw) {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

const CATEGORY_META = {
  medical:   { label: "Medical",   icon: AlertTriangle, color: "text-rose-600",  bg: "bg-rose-50",  border: "border-rose-200"  },
  lifestyle: { label: "Lifestyle", icon: Heart,         color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
};

function RecommendationCategory({ type, items }) {
  if (!items?.length) return null;
  const { label, icon: Icon, color, bg, border } = CATEGORY_META[type];
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className={`mb-3 flex items-center gap-2 ${color}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <p className="text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-foreground)]">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${color.replace("text-", "bg-")}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PredictionResult({ result, onSave, canSave, originalImageUrl, gradcamUrl, clinical }) {
  const isMultimodal = Boolean(result?.final);
  // gradcamUrl may already be a data: URL (from ScanDetails) or a raw base64 string (from NewScan)
  const gradcamSrc = gradcamUrl ? toDataSrc(gradcamUrl) : null;

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

  const meta    = getPredictionMeta(prediction);
  const isPcos  = prediction === "pcos";
  const risk    = getRiskLabel(pcosPct);
  const recs    = generateRecommendations(pcosPct, clinical);
  const hasRecs = recs.medical.length || recs.lifestyle.length;

  const riskColorMap = {
    emerald: { text: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300" },
    yellow:  { text: "text-yellow-700",  bg: "bg-yellow-100",  border: "border-yellow-300"  },
    orange:  { text: "text-orange-700",  bg: "bg-orange-100",  border: "border-orange-300"  },
    red:     { text: "text-red-700",     bg: "bg-red-100",     border: "border-red-300"     },
    rose:    { text: "text-rose-700",    bg: "bg-rose-100",    border: "border-rose-300"    },
  };
  const rc = riskColorMap[risk.color];

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
            <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rc.text} ${rc.bg} ${rc.border}`}>
              {risk.label}
            </span>
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

      {/* ── Grad-CAM + XAI ── */}
      {gradcamSrc && (
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Explainable AI — Grad-CAM</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Gradient-weighted Class Activation Map showing which regions of the ultrasound most influenced the model's {isPcos ? "PCOS" : "Normal"} prediction.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Original</p>
              <img src={originalImageUrl} alt="Original ultrasound" className="w-full rounded-2xl border border-[var(--color-border)] object-cover" />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Grad-CAM overlay</p>
              <img src={gradcamSrc} alt="Grad-CAM heatmap" className="w-full rounded-2xl border border-[var(--color-border)] object-cover" />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">Heatmap legend</p>
            <div className="h-3 flex-1 rounded-full" style={{ background: "linear-gradient(to right, #00f, #0ff, #0f0, #ff0, #f00)" }} />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted-foreground)]">
              <span>Low influence</span>
              <span>High influence</span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 space-y-1">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">How to interpret</p>
            <ul className="text-xs text-[var(--color-muted-foreground)] space-y-0.5 list-disc list-inside">
              <li><span className="text-red-500 font-semibold">Red/yellow</span> regions had the highest impact on the prediction.</li>
              <li><span className="text-blue-500 font-semibold">Blue</span> regions had little to no influence.</li>
              {isPcos
                ? <li>Highlighted areas likely correspond to follicular clusters or ovarian morphology indicative of PCOS.</li>
                : <li>Highlighted areas correspond to normal ovarian tissue features the model used to rule out PCOS.</li>
              }
            </ul>
          </div>
        </Card>
      )}

      {/* ── Recommendations ── */}
      {hasRecs && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Recommendations</p>
              <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                Personalised guidance based on your clinical values and risk level.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <RecommendationCategory type="medical"   items={recs.medical}   />
            <RecommendationCategory type="lifestyle" items={recs.lifestyle} />
          </div>
        </Card>
      )}

      {/* ── Model info + save (hidden in history view) ── */}
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
        {onSave && (
          <Button onClick={onSave} disabled={!canSave} className="shrink-0">
            <Save className="h-4 w-4" />
            Save Scan
          </Button>
        )}
      </Card>

      {/* ── Disclaimer ── */}
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-800">
        FemWell is an AI-assisted screening tool. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
      </div>
    </div>
  );
}

export default PredictionResult;
