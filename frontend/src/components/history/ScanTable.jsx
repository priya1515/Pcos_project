import { Link } from "react-router-dom";
import Button from "../common/Button";
import StatusBadge from "../common/StatusBadge";
import { formatPercent, formatShortDate } from "../../utils/formatters";

function ScanTable({ scans, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--color-border)] text-left text-sm">
        <thead>
          <tr className="text-[var(--color-muted-foreground)]">
            <th className="pb-4 font-medium">Scan ID</th>
            <th className="pb-4 font-medium">Date</th>
            <th className="pb-4 font-medium">Hospital Node</th>
            <th className="pb-4 font-medium">Prediction</th>
            <th className="pb-4 font-medium">Confidence</th>
            <th className="pb-4 font-medium">Status</th>
            <th className="pb-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {scans.map((scan) => (
            <tr key={scan.id}>
              <td className="py-4 font-semibold text-[var(--color-foreground)]">{scan.id}</td>
              <td className="py-4 text-[var(--color-muted-foreground)]">{formatShortDate(scan.createdAt)}</td>
              <td className="py-4">
                <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                  {scan.hospital ? scan.hospital.replace("hospital_", "Hospital ").toUpperCase() : "Not assigned"}
                </span>
              </td>
              <td className="py-4">
                <StatusBadge tone={scan.prediction === "pcos" ? "warning" : "success"}>
                  {scan.predictionLabel}
                </StatusBadge>
              </td>
              <td className="py-4 text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</td>
              <td className="py-4 text-[var(--color-muted-foreground)]">{scan.status}</td>
              <td className="py-4">
                <div className="flex flex-wrap gap-2">
                  <Button as={Link} to={`/history/${scan.id}`} variant="ghost" className="px-0 text-[var(--color-primary)]">
                    View
                  </Button>
                  <Button variant="ghost" className="px-0 text-rose-600" onClick={() => onDelete(scan.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScanTable;
