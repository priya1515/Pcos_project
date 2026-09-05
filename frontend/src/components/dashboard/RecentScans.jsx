import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatPercent, formatShortDate } from "../../utils/formatters";

function RecentScans({ scans }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Recent Scans</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">The latest saved ultrasound screenings from local history.</p>
        </div>
        <Link to="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--color-border)] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Scan ID</th>
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Date</th>
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Prediction</th>
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Confidence</th>
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Status</th>
              <th className="pb-3 text-xs font-bold uppercase tracking-[0.14em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {scans.map((scan) => (
              <tr key={scan.id} className="transition-colors hover:bg-[var(--color-surface-subtle)]">
                <td className="py-4 font-semibold text-[var(--color-foreground)]">{scan.id}</td>
                <td className="py-4 text-[var(--color-muted-foreground)]">{formatShortDate(scan.createdAt)}</td>
                <td className="py-4">
                  <StatusBadge tone={scan.prediction === "pcos" ? "warning" : "success"}>
                    {scan.predictionLabel}
                  </StatusBadge>
                </td>
                <td className="py-4 text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</td>
                <td className="py-4 text-[var(--color-muted-foreground)]">{scan.status}</td>
                <td className="py-4">
                  <Link className="font-semibold text-[var(--color-primary)]" to={`/history/${scan.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default RecentScans;
