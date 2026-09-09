import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import ScanComparison from "../components/compare/ScanComparison";
import { useAppContext } from "../context/useAppContext";
import { apiFetch } from "../api/client";
import { formatPercent, formatShortDate } from "../utils/formatters";

function Compare() {
  const { scans, compareSelection, addCompareSelection, resetCompareSelection } = useAppContext();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    apiFetch("/federated/scans")
      .then(r => setLogs(r.scans || []))
      .catch(() => setLogs([]));
  }, []);

  const scansWithLogs = useMemo(() => {
    return scans.map(scan => {
      const log = logs.find(l => l.fileName === scan.fileName && (!scan.hospital || l.hospital === scan.hospital));
      return { ...scan, log: log || null };
    });
  }, [scans, logs]);

  const selectedScans = compareSelection
    .map(id => scansWithLogs.find(s => s.id === id))
    .filter(Boolean);

  if (selectedScans.length === 2) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Comparing <span className="font-semibold text-[var(--color-foreground)]">{selectedScans[0].id}</span> and <span className="font-semibold text-[var(--color-foreground)]">{selectedScans[1].id}</span>
          </p>
          <Button variant="secondary" onClick={resetCompareSelection}>
            Change selection
          </Button>
        </div>
        <ScanComparison scans={selectedScans} />
      </div>
    );
  }

  // Inline scan picker
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h3 className="font-semibold text-[var(--color-foreground)]">Select two scans to compare</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Tick exactly 2 scans below, then click Compare.
            {compareSelection.length > 0 && (
              <span className="ml-2 font-semibold text-[var(--color-primary)]">
                {compareSelection.length}/2 selected
              </span>
            )}
          </p>
        </div>

        {scansWithLogs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">No saved scans yet.</p>
            <Button variant="secondary" className="mt-3" onClick={() => navigate("/new-scan")}>
              Run a scan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {scansWithLogs.map((scan) => {
              const isPcos = scan.prediction === "pcos";
              const selected = compareSelection.includes(scan.id);
              const disabled = !selected && compareSelection.length >= 2;

              return (
                <label
                  key={scan.id}
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : disabled
                        ? "cursor-not-allowed border-[var(--color-border)] opacity-40"
                        : "border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => addCompareSelection(scan.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Main info row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--color-foreground)]">{scan.id}</span>
                      <StatusBadge tone={isPcos ? "warning" : "success"}>{scan.predictionLabel}</StatusBadge>
                      {scan.hospital && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          {scan.hospital.replace("hospital_", "Hospital ").toUpperCase()}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(scan.createdAt)}</span>
                    </div>

                    {/* File + confidence */}
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
                      <span>{scan.fileName}</span>
                      <span>Confidence: <span className="font-semibold text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</span></span>
                    </div>

                    {/* Scan log entry if available */}
                    {scan.log && (
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] text-violet-500 uppercase tracking-wide">Image pred.</p>
                          <p className="text-xs font-semibold text-violet-800">{scan.log.image_prediction || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-violet-500 uppercase tracking-wide">Clinical pred.</p>
                          <p className="text-xs font-semibold text-violet-800">{scan.log.clinical_prediction || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-violet-500 uppercase tracking-wide">PCOS prob.</p>
                          <p className="text-xs font-semibold text-violet-800">
                            {scan.log.pcos_probability != null ? formatPercent(scan.log.pcos_probability * 100) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-violet-500 uppercase tracking-wide">Logged</p>
                          <p className="text-xs font-semibold text-violet-800">
                            {scan.log.timestamp ? formatShortDate(scan.log.timestamp) : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}


      </Card>
    </div>
  );
}

export default Compare;
