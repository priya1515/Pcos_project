import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { predictPCOS } from "../api/prediction";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import AnalysisLoader from "../components/scan/AnalysisLoader";
import ImageUploader from "../components/scan/ImageUploader";
import PredictionResult from "../components/scan/PredictionResult";
import { useAppContext } from "../context/useAppContext";
import { fileToDataUrl, validateImageFile } from "../utils/scan";

function NewScan() {
  const navigate = useNavigate();
  const { health, saveResultScan, pushToast } = useAppContext();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedScanId, setSavedScanId] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelect(nextFile) {
    const validationError = validateImageFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(nextFile);
    setResult(null);
    setSavedScanId("");
    setError("");
  }

  function handleRemove() {
    setFile(null);
    setResult(null);
    setSavedScanId("");
    setError("");
  }

  async function handleAnalyze() {
    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const prediction = await predictPCOS(file);
      setResult(prediction);
    } catch (requestError) {
      setError(
        health.status === "offline"
          ? "AI service unavailable. We couldn't connect to the prediction service."
          : requestError.message || "Analysis failed. Something went wrong while analyzing the ultrasound.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!file || !result || savedScanId) {
      return;
    }

    const imageDataUrl = await fileToDataUrl(file);
    const savedScan = saveResultScan({
      fileName: file.name,
      imageDataUrl,
      imageSize: file.size,
      result,
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

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Run AI-assisted screening</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">The current model uses ultrasound images only. Clinical data inputs are reserved for future multimodal expansion.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleRemove}>
            Reset
          </Button>
          <Button onClick={handleAnalyze} loading={loading} disabled={loading || !file}>
            Analyze Ultrasound
          </Button>
        </div>
      </Card>

      {loading && <AnalysisLoader />}

      {result && (
        <PredictionResult result={result} onSave={handleSave} canSave={!savedScanId} />
      )}

      {savedScanId && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Saved scan</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{savedScanId}</p>
          </div>
          <Button onClick={() => navigate(`/history/${savedScanId}`)}>Open Scan Details</Button>
        </Card>
      )}
    </div>
  );
}

export default NewScan;
