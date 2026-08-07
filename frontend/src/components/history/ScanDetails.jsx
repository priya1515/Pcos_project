import { ArrowRightLeft, FileDown, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import ProbabilityChart from "../scan/ProbabilityChart";
import { formatLongDate, formatPercent } from "../../utils/formatters";

function ScanDetails({ scan, onCompare, onDownload, onDelete }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr,0.85fr]">
      <Card className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Scan {scan.id}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">{scan.predictionLabel}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{formatLongDate(scan.createdAt)}</p>
          </div>
          <StatusBadge tone={scan.prediction === "pcos" ? "warning" : "success"}>
            {scan.status}
          </StatusBadge>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-slate-100">
          <img src={scan.imageDataUrl} alt={`Ultrasound for ${scan.id}`} className="h-full w-full object-cover" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">Confidence</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">Analysis Type</p>
            <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">{scan.analysisType}</p>
          </div>
        </div>
        <ProbabilityChart probabilities={scan.probabilities} />
      </Card>

      <div className="space-y-6">
        <Card className="space-y-4">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">Model</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{scan.model}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">File name</p>
            <p className="mt-1 font-semibold text-[var(--color-foreground)]">{scan.fileName}</p>
          </div>
        </Card>

        <Card className="space-y-3">
          <Button onClick={onCompare}>
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
          <Button as={Link} to="/new-scan" variant="ghost">
            New Analysis
          </Button>
        </Card>

        <Card className="bg-cyan-50">
          <p className="text-sm leading-6 text-cyan-900">
            FemWell is an AI-assisted screening tool based on ultrasound image analysis. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default ScanDetails;
