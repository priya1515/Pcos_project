import { FileDown } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { formatPercent, formatShortDate } from "../utils/formatters";

function Reports() {
  const { scans, downloadScanReport } = useAppContext();

  if (!scans.length) {
    return (
      <EmptyState
        title="No reports available"
        description="Save at least one screening result before generating reports."
        actionLabel="New Scan"
        actionHref="/new-scan"
      />
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Saved scan reports</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">PDF export can be added later without changing page structure. Current downloads use a report service abstraction.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {scans.map((scan) => (
          <div key={scan.id} className="grid gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5 lg:grid-cols-[1fr,auto] lg:items-center">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">{scan.id} • {formatShortDate(scan.createdAt)}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{scan.predictionLabel}</p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Confidence {formatPercent(scan.confidence)} • {scan.model}</p>
            </div>
            <Button onClick={() => downloadScanReport(scan)}>
              <FileDown className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default Reports;
