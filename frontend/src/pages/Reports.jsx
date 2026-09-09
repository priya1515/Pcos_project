import { useState } from "react";
import { FileDown, CheckCircle2, AlertCircle, Clock, Building2 } from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import { useAppContext } from "../context/useAppContext";
import { formatPercent, formatLongDate } from "../utils/formatters";

function ProbBar({ label, value, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-semibold text-[var(--color-foreground)]">{formatPercent(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
    </div>
  );
}

const TABS = ["All", "PCOS", "Normal"];

function Reports() {
  const { scans, downloadScanReport, searchQuery } = useAppContext();
  const [activeTab, setActiveTab] = useState("All");

  const q = searchQuery.toLowerCase();
  const filtered = scans
    .filter(s =>
      (!q || s.id.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q) || s.predictionLabel?.toLowerCase().includes(q)) &&
      (activeTab === "All" || s.prediction === activeTab.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pcosCount   = scans.filter(s => s.prediction === "pcos").length;
  const normalCount = scans.filter(s => s.prediction === "normal").length;

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
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Reports", value: scans.length,  color: "bg-slate-800"   },
          { label: "PCOS Detected",  value: pcosCount,    color: "bg-amber-500"   },
          { label: "Normal",         value: normalCount,  color: "bg-emerald-500" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`h-10 w-1.5 shrink-0 rounded-full ${color}`} />
            <div>
              <p className="text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="space-y-5">
        {/* Header + tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[var(--color-foreground)]">Saved Scan Reports</h3>
            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-[var(--color-primary)] text-white shadow"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">No reports match the current filter.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((scan) => {
              const isPcos    = scan.prediction === "pcos";
              const pcosPct   = scan.probabilities?.pcos   > 1 ? scan.probabilities.pcos   : (scan.probabilities?.pcos   ?? 0) * 100;
              const normalPct = scan.probabilities?.normal > 1 ? scan.probabilities.normal : (scan.probabilities?.normal ?? 0) * 100;

              return (
                <div
                  key={scan.id}
                  className={`rounded-2xl border ${isPcos ? "border-amber-200" : "border-emerald-200"} bg-[var(--color-surface-subtle)]`}
                >
                  {/* Indicator strip */}
                  <div className={`flex items-center gap-2.5 rounded-t-2xl px-5 py-2.5 ${isPcos ? "bg-amber-50" : "bg-emerald-50"}`}>
                    {isPcos
                      ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    }
                    <span className={`text-xs font-bold uppercase tracking-[0.14em] ${isPcos ? "text-amber-700" : "text-emerald-700"}`}>
                      {scan.predictionLabel}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-3">

                      {/* Scan ID + file */}
                      <div>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{scan.id}</p>
                        <p className="mt-0.5 font-semibold text-[var(--color-foreground)]">{scan.fileName}</p>
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                          <Clock className="h-3 w-3" />
                          {formatLongDate(scan.createdAt)}
                        </span>
                        {scan.hospital && (
                          <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-700">
                            <Building2 className="h-3 w-3" />
                            {scan.hospital.replace("hospital_", "Hospital ").toUpperCase()}
                          </span>
                        )}
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                          Confidence: <span className="font-semibold text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</span>
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                          {scan.model || "Multimodal"}
                        </span>
                      </div>

                      {/* Probability bars */}
                      <div className="max-w-xs space-y-1.5">
                        <ProbBar label="PCOS"   value={pcosPct}   color="bg-amber-500"   />
                        <ProbBar label="Normal" value={normalPct} color="bg-emerald-500" />
                      </div>
                    </div>

                    {/* Download */}
                    <Button onClick={() => downloadScanReport(scan)} className="shrink-0 gap-2 self-start">
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Reports;
