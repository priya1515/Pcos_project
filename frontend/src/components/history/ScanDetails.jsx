import { ArrowRightLeft, FileDown, Trash2 } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import PredictionResult from "../scan/PredictionResult";
import { formatLongDate } from "../../utils/formatters";

function toDataSrc(raw) {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

function ScanDetails({ scan, onCompare, onDownload, onDelete }) {
  // Reconstruct the result shape PredictionResult expects
  const result = scan.rawResult || {
    final: null,
    prediction: scan.prediction,
    probabilities: scan.probabilities,
    model: scan.model,
    analysisType: scan.analysisType,
  };

  const gradcamSrc = toDataSrc(scan.gradcamImage);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Scan {scan.id}</p>
          <p className="mt-0.5 text-lg font-semibold text-[var(--color-foreground)]">{scan.fileName}</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{formatLongDate(scan.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onCompare}>
            <ArrowRightLeft className="h-4 w-4" />
            Compare
          </Button>
          <Button variant="secondary" onClick={onDownload}>
            <FileDown className="h-4 w-4" />
            Download Report
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Card>

      {/* Original ultrasound image */}
      <Card>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Ultrasound Image
        </p>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-100">
          <img
            src={scan.imageDataUrl}
            alt={`Ultrasound for ${scan.id}`}
            className="w-full object-contain"
          />
        </div>
      </Card>

      {/* Full prediction result — probabilities, Grad-CAM, XAI, recommendations */}
      <PredictionResult
        result={result}
        onSave={null}
        canSave={false}
        originalImageUrl={scan.imageDataUrl}
        gradcamUrl={gradcamSrc}
        clinical={scan.clinical}
      />
    </div>
  );
}

export default ScanDetails;
