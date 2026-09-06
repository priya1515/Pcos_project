import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { predictMultimodal } from "../api/prediction";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import AnalysisLoader from "../components/scan/AnalysisLoader";
import ImageUploader from "../components/scan/ImageUploader";
import PredictionResult from "../components/scan/PredictionResult";
import { useAppContext } from "../context/useAppContext";
import { fileToDataUrl, validateImageFile } from "../utils/scan";

const CLINICAL_FIELDS = [
  { key: "age",          label: "Age",                      unit: "yrs",      min: 10,  max: 60,   step: 1    },
  { key: "height",       label: "Height",                   unit: "cm",       min: 100, max: 220,  step: 0.1  },
  { key: "pulse_rate",   label: "Pulse Rate",               unit: "bpm",      min: 40,  max: 200,  step: 1    },
  { key: "rbs",          label: "Random Blood Sugar",       unit: "mg/dl",    min: 50,  max: 400,  step: 0.1  },
  { key: "bp_systolic",  label: "Systolic Blood Pressure",  unit: "mmHg",     min: 70,  max: 200,  step: 1    },
  { key: "cycle_length", label: "Cycle Length",             unit: "days",     min: 1,   max: 35,   step: 1    },
  { key: "lh",           label: "LH",                       unit: "mIU/mL",   min: 0,   max: 200,  step: 0.01 },
  { key: "amh",          label: "AMH",                      unit: "ng/mL",    min: 0,   max: 20,   step: 0.01 },
  { key: "prl",          label: "Prolactin (PRL)",          unit: "ng/mL",    min: 0,   max: 200,  step: 0.01 },
  { key: "vit_d3",       label: "Vitamin D3",               unit: "ng/mL",    min: 0,   max: 150,  step: 0.1  },
  { key: "follicle_r",   label: "Follicle Count (Right)",   unit: "count",    min: 0,   max: 30,   step: 1    },
  { key: "follicle_l",   label: "Follicle Count (Left)",    unit: "count",    min: 0,   max: 30,   step: 1    },
  { key: "avg_f_size_r", label: "Avg. Follicle Size (R)",   unit: "mm",       min: 0,   max: 40,   step: 0.1  },
  { key: "beta_hcg_1",   label: "Beta-HCG I",               unit: "mIU/mL",   min: 0,   max: 200,  step: 0.01 },
  { key: "beta_hcg_2",   label: "Beta-HCG II",              unit: "mIU/mL",   min: 0,   max: 200,  step: 0.01 },
];

const EMPTY_CLINICAL = Object.fromEntries(CLINICAL_FIELDS.map((f) => [f.key, ""]));

function NewScan() {
  const navigate = useNavigate();
  const { health, saveResultScan, pushToast } = useAppContext();
  const [file, setFile] = useState(null);
  const [clinical, setClinical] = useState(EMPTY_CLINICAL);
  const [result, setResult] = useState(null);
  const [gradcamUrl, setGradcamUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedScanId, setSavedScanId] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelect(nextFile) {
    const validationError = validateImageFile(nextFile);
    if (validationError) { setError(validationError); return; }
    setFile(nextFile);
    setResult(null);
    setSavedScanId("");
    setError("");
  }

  function handleRemove() {
    setFile(null);
    setClinical(EMPTY_CLINICAL);
    setResult(null);
    setGradcamUrl(null);
    setSavedScanId("");
    setError("");
  }

  function handleClinicalChange(key, value) {
    setClinical((prev) => ({ ...prev, [key]: value }));
  }

  function validateClinical() {
    const missing = CLINICAL_FIELDS.filter((f) => clinical[f.key] === "" || clinical[f.key] === null);
    if (missing.length > 0) {
      return `Please fill in: ${missing.map((f) => f.label).join(", ")}`;
    }
    return null;
  }

  async function handleAnalyze() {
    const imageError = validateImageFile(file);
    if (imageError) { setError(imageError); return; }

    const clinicalError = validateClinical();
    if (clinicalError) { setError(clinicalError); return; }

    setLoading(true);
    setError("");

    try {
      const numericClinical = Object.fromEntries(
        CLINICAL_FIELDS.map((f) => [f.key, parseFloat(clinical[f.key])])
      );
      const data = await predictMultimodal(file, numericClinical);
      setResult(data);
      setGradcamUrl(data.gradcam_image || null);
    } catch (requestError) {
      setError(
        health.status === "offline"
          ? "AI service unavailable. We couldn't connect to the prediction service."
          : requestError.message || "Analysis failed. Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!file || !result || savedScanId) return;

    const imageDataUrl = await fileToDataUrl(file);
    const finalPrediction = result.final?.prediction?.toLowerCase() || "unknown";

    const savedScan = saveResultScan({
      fileName: file.name,
      imageDataUrl,
      imageSize: file.size,
      clinical,
      result: {
        prediction: finalPrediction,
        confidence: result.final ? result.final.pcos_probability * 100 : 0,
        probabilities: {
          pcos: result.final?.pcos_probability || 0,
          normal: result.final?.normal_probability || 0,
        },
        model: "Multimodal (Clinical + ResNet-50)",
        analysisType: "Clinical + Ultrasound",
        raw: result,
      },
    });

    setSavedScanId(savedScan.id);
    pushToast({
      title: "Ready for review",
      description: `${savedScan.id} can now be opened from scan history.`,
      tone: "info",
    });
  }

  return (
    <div className="space-y-6">
      <ImageUploader
        file={file}
        previewUrl={previewUrl}
        error={error}
        onFileSelect={handleFileSelect}
        onRemove={handleRemove}
      />

      {/* Clinical input form */}
      <Card className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Clinical Data</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Enter the 15 selected clinical features for multimodal PCOS analysis.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLINICAL_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={field.key}
                className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
              >
                {field.label}
                <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">({field.unit})</span>
              </label>
              <input
                id={field.key}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={clinical[field.key]}
                onChange={(e) => handleClinicalChange(field.key, e.target.value)}
                placeholder={`e.g. ${field.min}`}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Run multimodal PCOS screening</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Combines clinical data and ultrasound image analysis for a fused prediction.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleRemove}>Reset</Button>
          <Button onClick={handleAnalyze} loading={loading} disabled={loading || !file}>
            Analyze
          </Button>
        </div>
      </Card>

      {loading && <AnalysisLoader />}

      {result && (
        <PredictionResult
          result={result}
          onSave={handleSave}
          canSave={!savedScanId}
          originalImageUrl={previewUrl}
          gradcamUrl={gradcamUrl}
          clinical={clinical}
        />
      )}

      {savedScanId && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Scan saved as <span className="font-semibold">{savedScanId}</span>. View it in{" "}
          <button
            onClick={() => navigate(`/history/${savedScanId}`)}
            className="font-semibold underline underline-offset-2"
          >
            Scan History
          </button>.
        </div>
      )}
    </div>
  );
}

export default NewScan;
