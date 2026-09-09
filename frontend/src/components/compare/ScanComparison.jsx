import { useEffect, useState } from "react";
import Card from "../common/Card";
import { formatPercent, formatShortDate, formatLongDate } from "../../utils/formatters";
import { apiFetch } from "../../api/client";

function toDataSrc(raw) {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

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

const CLINICAL_LABELS = {
  age: "Age", height: "Height", pulse_rate: "Pulse Rate", rbs: "Blood Sugar",
  bp_systolic: "Systolic BP", cycle_length: "Cycle Length", lh: "LH", amh: "AMH",
  prl: "Prolactin", vit_d3: "Vit D3", follicle_r: "Follicles (R)", follicle_l: "Follicles (L)",
  avg_f_size_r: "Avg Follicle (R)", beta_hcg_1: "Beta-HCG I", beta_hcg_2: "Beta-HCG II",
};

function ScanColumn({ scan, log }) {
  const isPcos = scan.prediction === "pcos";
  const pcosPct   = scan.probabilities?.pcos   > 1 ? scan.probabilities.pcos   : (scan.probabilities?.pcos   ?? 0) * 100;
  const normalPct = scan.probabilities?.normal > 1 ? scan.probabilities.normal : (scan.probabilities?.normal ?? 0) * 100;
  const gradcam   = toDataSrc(scan.gradcamImage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl border p-4 ${isPcos ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <p className="text-xs text-[var(--color-muted-foreground)]">{scan.id}</p>
        <p className="mt-0.5 font-semibold text-[var(--color-foreground)]">{scan.fileName}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{formatLongDate(scan.createdAt)}</p>
        <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${isPcos ? "bg-amber-200 text-amber-800" : "bg-emerald-200 text-emerald-800"}`}>
          {scan.predictionLabel}
        </div>
        {scan.hospital && (
          <div className="mt-1.5 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ml-2">
            {scan.hospital.replace("hospital_", "Hospital ").toUpperCase()}
          </div>
        )}
      </div>

      {/* Ultrasound image */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-100">
        <img src={scan.imageDataUrl} alt={`Ultrasound ${scan.id}`} className="w-full object-contain" />
      </div>

      {/* Grad-CAM */}
      {gradcam && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-muted-foreground)]">Grad-CAM Overlay</p>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <img src={gradcam} alt="Grad-CAM" className="w-full object-contain" />
          </div>
        </div>
      )}

      {/* Probabilities */}
      <Card className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Probabilities</p>
        <ProbBar label="PCOS"   value={pcosPct}   color="bg-amber-500" />
        <ProbBar label="Normal" value={normalPct} color="bg-emerald-500" />
        <div className="pt-1 text-xs text-[var(--color-muted-foreground)]">
          Confidence: <span className="font-semibold text-[var(--color-foreground)]">{formatPercent(scan.confidence)}</span>
        </div>
      </Card>

      {/* Clinical values */}
      {scan.clinical && Object.keys(scan.clinical).length > 0 && (
        <Card className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">Clinical Values</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(scan.clinical).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs text-[var(--color-muted-foreground)]">{CLINICAL_LABELS[key] || key}</p>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">{val ?? "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scan log entry */}
      {log && (
        <Card className="space-y-2 border-violet-200 bg-violet-50">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Scan Log Entry</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div><p className="text-[var(--color-muted-foreground)]">Hospital</p><p className="font-semibold text-[var(--color-foreground)]">{log.hospital?.replace("hospital_", "Hospital ").toUpperCase() || "—"}</p></div>
            <div><p className="text-[var(--color-muted-foreground)]">Logged at</p><p className="font-semibold text-[var(--color-foreground)]">{log.timestamp ? formatShortDate(log.timestamp) : "—"}</p></div>
            <div><p className="text-[var(--color-muted-foreground)]">Image prediction</p><p className="font-semibold text-[var(--color-foreground)]">{log.image_prediction || "—"}</p></div>
            <div><p className="text-[var(--color-muted-foreground)]">Clinical prediction</p><p className="font-semibold text-[var(--color-foreground)]">{log.clinical_prediction || "—"}</p></div>
            <div><p className="text-[var(--color-muted-foreground)]">PCOS prob.</p><p className="font-semibold text-[var(--color-foreground)]">{log.pcos_probability != null ? formatPercent(log.pcos_probability * 100) : "—"}</p></div>
            <div><p className="text-[var(--color-muted-foreground)]">Normal prob.</p><p className="font-semibold text-[var(--color-foreground)]">{log.normal_probability != null ? formatPercent(log.normal_probability * 100) : "—"}</p></div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ScanComparison({ scans }) {
  const [first, second] = scans;
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    apiFetch("/federated/scans")
      .then(r => setLogs(r.scans || []))
      .catch(() => setLogs([]));
  }, []);

  function findLog(scan) {
    return logs.find(l => l.fileName === scan.fileName && (!scan.hospital || l.hospital === scan.hospital)) || null;
  }

  const confidenceChange = second ? second.confidence - first.confidence : 0;
  const pcosDiff = (() => {
    const a = first.probabilities?.pcos  > 1 ? first.probabilities.pcos  : (first.probabilities?.pcos  ?? 0) * 100;
    const b = second.probabilities?.pcos > 1 ? second.probabilities.pcos : (second.probabilities?.pcos ?? 0) * 100;
    return b - a;
  })();

  return (
    <div className="space-y-6">
      {/* Side-by-side columns */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ScanColumn scan={first}  log={findLog(first)}  />
        <ScanColumn scan={second} log={findLog(second)} />
      </div>

      {/* Summary card */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">Comparison Summary</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Prediction",
              value: `${first.predictionLabel} → ${second.predictionLabel}`,
              same: first.prediction === second.prediction,
            },
            {
              label: "Confidence change",
              value: `${confidenceChange >= 0 ? "+" : ""}${confidenceChange.toFixed(2)} pp`,
              positive: confidenceChange >= 0,
            },
            {
              label: "PCOS probability shift",
              value: `${pcosDiff >= 0 ? "+" : ""}${pcosDiff.toFixed(1)}%`,
              positive: pcosDiff <= 0,
            },
            {
              label: "Hospital nodes",
              value: [first.hospital, second.hospital].filter(Boolean).map(h => h.replace("hospital_", "H")).join(" vs ") || "—",
            },
          ].map(({ label, value, same, positive }) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
              <p className={`mt-1.5 font-semibold text-[var(--color-foreground)] ${
                same === false ? "text-amber-600" :
                positive === true ? "text-emerald-600" :
                positive === false ? "text-rose-600" : ""
              }`}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          This comparison summarises saved model outputs only. It should not be interpreted as evidence of clinical progression without broader longitudinal context.
        </p>
      </Card>
    </div>
  );
}

export default ScanComparison;
