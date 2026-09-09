import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Clock, Server, Shield, Wifi, WifiOff, Zap, AlertTriangle } from "lucide-react";
import Card from "../components/common/Card";
import { apiFetch } from "../api/client";
import { useAppContext } from "../context/useAppContext";

const POLL_MS = 3000;

function StatusBadge({ status }) {
  const cfg = {
    idle:      { dot: "bg-slate-400",            ring: "ring-slate-200",   text: "text-slate-600",   label: "Idle"      },
    running:   { dot: "bg-blue-500 animate-ping", ring: "ring-blue-200",   text: "text-blue-700",    label: "Running"   },
    completed: { dot: "bg-emerald-500",           ring: "ring-emerald-200", text: "text-emerald-700", label: "Completed" },
  };
  const c = cfg[status] || cfg.idle;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${c.ring} ${c.text} bg-white`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${accent ? "border-violet-200 bg-gradient-to-br from-violet-50 to-white" : "border-[var(--color-border)] bg-[var(--color-surface-subtle)]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">{label}</p>
      <p className={`mt-2 text-3xl font-black ${accent ? "text-violet-700" : "text-[var(--color-foreground)]"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
      {accent && <Zap className="absolute right-4 top-4 h-5 w-5 text-violet-300" />}
    </div>
  );
}

function AccBar({ value, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{value != null ? `${value}%` : "—"}</span>
    </div>
  );
}

function DualChart({ rounds }) {
  const [active, setActive] = useState("image_accuracy");
  if (!rounds.length) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)]">
        <Activity className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-40" />
        <p className="text-sm text-[var(--color-muted-foreground)]">Waiting for training rounds…</p>
      </div>
    );
  }
  const w = 600, h = 180, padL = 44, padB = 32, padT = 16, padR = 20;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const TABS = [
    { key: "image_accuracy",    label: "Image Acc",    color: "#7c3aed", pct: true  },
    { key: "clinical_accuracy", label: "Clinical Acc", color: "#0ea5e9", pct: true  },
    { key: "fused_accuracy",    label: "Fused Acc",    color: "#10b981", pct: true  },
    { key: "image_loss",        label: "Image Loss",   color: "#f59e0b", pct: false },
  ];
  const tab    = TABS.find(t => t.key === active) || TABS[0];
  const values = rounds.map(r => r[active] ?? 0);
  const isPct  = tab.pct;
  const maxVal = isPct ? 100 : Math.max(...values) * 1.15 || 1;
  const gridVals = isPct ? [0, 25, 50, 75, 100] : [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];
  const xStep = rounds.length > 1 ? chartW / (rounds.length - 1) : chartW;
  const pts = rounds.map((r, i) => ({
    x: padL + (rounds.length > 1 ? i * xStep : chartW / 2),
    y: padT + chartH - (values[i] / maxVal) * chartH,
    round: r.round,
  }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${padT + chartH} ${line} ${pts[pts.length - 1].x},${padT + chartH}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${active === t.key ? "text-white shadow" : "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"}`}
            style={active === t.key ? { background: t.color } : {}}>{t.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 180 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={tab.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={tab.color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => {
          const y = padT + chartH - (v / maxVal) * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{isPct ? `${Math.round(v)}%` : v.toFixed(2)}</text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#chartGrad)" />
        <polyline points={line} fill="none" stroke={tab.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={tab.color} strokeWidth="2" />
            <text x={p.x} y={padT + chartH + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">R{p.round}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RoundTable({ rounds }) {
  if (!rounds.length) return null;
  const hasClinical = rounds.some(r => r.clinical_accuracy != null);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
            {["Round", "Clients", "Image Acc", ...(hasClinical ? ["Clinical Acc", "Fused Acc"] : []), "Loss", "Time"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rounds].reverse().map((r, i) => (
            <tr key={r.round} className={`border-b border-[var(--color-border)] last:border-0 transition-colors ${i === 0 ? "bg-violet-50" : "hover:bg-[var(--color-surface-subtle)]"}`}>
              <td className="px-4 py-3 font-bold text-[var(--color-foreground)]">#{r.round}</td>
              <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{r.clients}</td>
              <td className="px-4 py-3"><AccBar value={r.image_accuracy ?? r.accuracy} color="#7c3aed" /></td>
              {hasClinical && <td className="px-4 py-3"><AccBar value={r.clinical_accuracy} color="#0ea5e9" /></td>}
              {hasClinical && <td className="px-4 py-3"><AccBar value={r.fused_accuracy}    color="#10b981" /></td>}
              <td className="px-4 py-3 font-mono text-[var(--color-muted-foreground)]">{r.image_loss ?? r.loss}</td>
              <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const HOSP_WEIGHT_STYLES = {
  hospital_a: { bar: "bg-blue-500",    track: "bg-blue-100",    label: "text-blue-700",    badge: "bg-blue-100 text-blue-700",       border: "border-blue-200"    },
  hospital_b: { bar: "bg-violet-500",  track: "bg-violet-100",  label: "text-violet-700",  badge: "bg-violet-100 text-violet-700",   border: "border-violet-200"  },
  hospital_c: { bar: "bg-emerald-500", track: "bg-emerald-100", label: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
};

function WeightBar({ label, value, barClass, trackClass }) {
  const max = 30;
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-bold tabular-nums text-[var(--color-foreground)]">{value ?? "—"}</span>
      </div>
      <div className={`h-1.5 w-full rounded-full ${trackClass}`}>
        <div className={`h-1.5 rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WeightsPanel({ weights }) {
  if (!weights) return null;
  const g     = weights.global || {};
  const local = weights.local  || {};

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
            <Zap className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Model Weights</p>
            <p className="text-sm font-bold text-[var(--color-foreground)]">Round {weights.round}</p>
          </div>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
          {g.tensors} tensors
        </span>
      </div>

      {/* Global model */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Global Model</p>
          <span className="rounded-full bg-violet-200 px-2.5 py-0.5 text-[10px] font-bold text-violet-800">Aggregated</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <WeightBar label="L2 Norm"  value={g.l2_norm}  barClass="bg-violet-500" trackClass="bg-violet-100" />
          <WeightBar label="Mean Abs" value={g.mean_abs} barClass="bg-violet-400" trackClass="bg-violet-100" />
        </div>
      </div>

      {/* Per-hospital */}
      {Object.keys(local).length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Local Node Weights</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(local).map(([hid, w]) => {
              const s = HOSP_WEIGHT_STYLES[hid] || { bar: "bg-slate-500", track: "bg-slate-100", label: "text-slate-700", badge: "bg-slate-100 text-slate-700", border: "border-slate-200" };
              return (
                <div key={hid} className={`rounded-2xl border ${s.border} bg-[var(--color-surface-subtle)] p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${s.label}`}>
                      {hid.replace("hospital_", "Hospital ")}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>Node</span>
                  </div>
                  <div className="space-y-2.5">
                    <WeightBar label="Image L2"    value={w.image_l2_norm}      barClass={s.bar} trackClass={s.track} />
                    <WeightBar label="Clinical L2" value={w.clinical_l2_norm}   barClass={s.bar} trackClass={s.track} />
                    <WeightBar label="Image Mean"  value={w.image_mean_abs}     barClass={s.bar} trackClass={s.track} />
                    <WeightBar label="Clin. Mean"  value={w.clinical_mean_abs}  barClass={s.bar} trackClass={s.track} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

const HOSP_COLORS = [
  { bg: "bg-blue-50",    icon: "text-blue-600",    ring: "ring-blue-200",    badge: "bg-blue-100 text-blue-700"    },
  { bg: "bg-violet-50",  icon: "text-violet-600",  ring: "ring-violet-200",  badge: "bg-violet-100 text-violet-700"  },
  { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
];

function HospitalWithScans({ hospital, index, scans, search }) {
  const [open, setOpen] = useState(false);
  const c = HOSP_COLORS[index % HOSP_COLORS.length];
  const active = hospital.connected || scans.length > 0;
  const q = (search || "").toLowerCase();
  const filtered = q
    ? scans.filter(s =>
        s.fileName?.toLowerCase().includes(q) ||
        s.prediction?.toLowerCase().includes(q) ||
        s.image_prediction?.toLowerCase().includes(q) ||
        s.clinical_prediction?.toLowerCase().includes(q)
      )
    : scans;

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${active ? `ring-1 ${c.ring} border-transparent` : "border-[var(--color-border)]"}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-surface-subtle)] rounded-2xl transition-colors">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? c.bg : "bg-slate-100"}`}>
            {active ? <Wifi className={`h-5 w-5 ${c.icon}`} /> : <WifiOff className="h-5 w-5 text-slate-400" />}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-foreground)]">{hospital.name}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{hospital.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.badge}`}>
            {scans.length} scan{scans.length !== 1 ? "s" : ""}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? c.icon : "text-slate-400"}`}>
            {active ? "Active" : "Waiting"}
          </span>
          <span className={`text-[var(--color-muted-foreground)] transition-transform duration-200 inline-block ${open ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted-foreground)]">{q ? "No matching scans." : "No scans logged yet."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
                    {["Time", "File", "Result", "PCOS %", "Image", "Clinical"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id || i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-subtle)] transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-[var(--color-muted-foreground)]">
                        {s.timestamp ? new Date(s.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-[var(--color-foreground)]" title={s.fileName}>{s.fileName || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.prediction?.toLowerCase() === "pcos" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {s.prediction || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--color-foreground)]">
                        {s.pcos_probability != null ? `${(s.pcos_probability * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-muted-foreground)]">{s.image_prediction || "—"}</td>
                      <td className="px-3 py-2 text-[var(--color-muted-foreground)]">{s.clinical_prediction || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Federation() {
  const [data,        setData]        = useState(null);
  const [hospitals,   setHospitals]   = useState([]);
  const [scanLog,     setScanLog]     = useState([]);
  const [error,       setError]       = useState("");
  const [lastAt,      setLastAt]      = useState(null);
  const [flRounds,    setFlRounds]    = useState(10);
  const [flEpochs,    setFlEpochs]    = useState(3);
  const [flStarting,  setFlStarting]  = useState(false);
  const [flIssues,    setFlIssues]    = useState([]);
  const [flWarn,      setFlWarn]      = useState("");
  const { searchQuery } = useAppContext();
  const [prevRounds,  setPrevRounds]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("fl_round_history") || "[]"); }
    catch { return []; }
  });
  const [prevMetrics, setPrevMetrics] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fl_last_session") || "null"); }
    catch { return null; }
  });
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    const [statusRes, hospRes, logsRes] = await Promise.allSettled([
      apiFetch("/federated/status"),
      apiFetch("/federated/hospitals"),
      apiFetch("/federated/scans"),
    ]);
    if (statusRes.status === "rejected" && hospRes.status === "rejected") {
      setError("Cannot reach FastAPI. Make sure uvicorn is running on port 8001.");
      return;
    }
    setError("");
    if (statusRes.status === "fulfilled") {
      const s = statusRes.value;
      if (s.rounds?.length > 0) {
        setPrevRounds(s.rounds);
        localStorage.setItem("fl_round_history", JSON.stringify(s.rounds));
        if (s.status === "completed") {
          const session = {
            completed_at: s.completed_at, total_rounds: s.total_rounds,
            current_round: s.current_round, best_accuracy: s.best_accuracy,
            clients_connected: s.clients_connected, rounds: s.rounds,
          };
          localStorage.setItem("fl_last_session", JSON.stringify(session));
          setPrevMetrics(session);
        }
      }
      setData(s);
      setLastAt(new Date());
    }
    if (hospRes.status === "fulfilled") setHospitals(hospRes.value.hospitals || []);
    if (logsRes.status === "fulfilled") setScanLog(logsRes.value.scans || []);
  }, []);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchStatus]);

  async function handleStartFL() {
    setFlStarting(true);
    setFlIssues([]);
    setFlWarn("");
    try {
      await apiFetch("/federated/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds: flRounds, epochs: flEpochs }),
      });
      await fetchStatus();
    } catch (err) {
      const detail = err.detail;
      if (detail?.data_unchanged) {
        setFlStarting(false);
        const confirmed = window.confirm(
          "The federated data has not changed since the last completed training run.\n\nDo you still want to start training?"
        );
        if (!confirmed) return;
        try {
          setFlStarting(true);
          await apiFetch("/federated/start?force=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rounds: flRounds, epochs: flEpochs }),
          });
          await fetchStatus();
        } catch (e2) {
          const d2 = e2.detail;
          setFlIssues(d2?.issues || [e2.message || "Failed to start FL session."]);
        } finally {
          setFlStarting(false);
        }
        return;
      }
      if (detail?.issues) setFlIssues(detail.issues);
      else setFlIssues([err.message || "Failed to start FL session."]);
    } finally {
      setFlStarting(false);
    }
  }

  async function handleStopFL() {
    try {
      await apiFetch("/federated/stop", { method: "POST" });
      await fetchStatus();
    } catch {
      setError("Failed to stop FL session.");
    }
  }

  const rounds      = data?.rounds?.length > 0 ? data.rounds : prevRounds;
  const status      = data?.status || "idle";
  const isLive      = status === "running";
  const displayData = isLive ? data : (data?.current_round > 0 ? data : (prevMetrics || data));
  const progress    = displayData?.total_rounds ? (displayData.current_round / displayData.total_rounds) * 100 : 0;
  const lastSession = prevMetrics;
  const liveRound   = isLive && rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const fallbackHospitals = [
    { id: "hospital_a", name: "Hospital A", location: "Node 1", connected: false },
    { id: "hospital_b", name: "Hospital B", location: "Node 2", connected: false },
    { id: "hospital_c", name: "Hospital C", location: "Node 3", connected: false },
  ];
  const displayHospitals = hospitals.length ? hospitals : fallbackHospitals;

  return (
    <div className="space-y-6">

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">Federated Learning</p>
          <h2 className="mt-1 text-2xl font-black text-[var(--color-foreground)]">Training Dashboard</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Privacy-preserving distributed training · FedAvg · ResNet-50</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FL controls */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Run Federated Training</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Rounds</label>
            <input type="number" min={1} max={50} value={flRounds}
              onChange={e => { setFlRounds(Number(e.target.value)); setFlIssues([]); }}
              disabled={status === "running"}
              className="w-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Epochs / Client</label>
            <input type="number" min={1} max={20} value={flEpochs}
              onChange={e => { setFlEpochs(Number(e.target.value)); setFlIssues([]); }}
              disabled={status === "running"}
              className="w-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50" />
          </div>
          {status !== "running" ? (
            <button onClick={handleStartFL} disabled={flStarting}
              className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-700 disabled:opacity-60 transition-colors">
              <Zap className="h-4 w-4" />
              {flStarting ? "Checking…" : "Start FL Training"}
            </button>
          ) : (
            <button onClick={handleStopFL}
              className="flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-600 transition-colors">
              Stop Training
            </button>
          )}
        </div>
        {flIssues.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs font-bold text-amber-700">Cannot start FL — fix the following issues:</p>
            </div>
            <ul className="space-y-1 pl-6">
              {flIssues.map((issue, i) => <li key={i} className="text-xs text-amber-700 list-disc">{issue}</li>)}
            </ul>
          </div>
        )}
        {flWarn && (
          <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p className="text-xs text-sky-700">{flWarn}</p>
          </div>
        )}
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          FedAvg runs once per round — only after all 3 hospital clients finish local training and send weight updates.
          Each round: local train → weight upload → FedAvg → new global model → next round.
        </p>
      </Card>

      {/* last session banner */}
      {lastSession && status !== "running" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-sm">✓</span>
            <p className="text-xs font-bold text-emerald-700">Last FL Training Saved</p>
            <span className="text-xs text-emerald-600">
              {lastSession.total_rounds} rounds · Best accuracy {lastSession.best_accuracy}% · Completed {new Date(lastSession.completed_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* progress card */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
              <Server className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--color-foreground)]">FL Server · FedAvg</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Polling every {POLL_MS / 1000}s · {lastAt ? `updated ${lastAt.toLocaleTimeString()}` : "waiting…"}
              </p>
            </div>
          </div>
          {displayData?.started_at && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <Clock className="h-3.5 w-3.5" />
              Started {new Date(displayData.started_at).toLocaleTimeString()}
              {displayData.completed_at && ` · Finished ${new Date(displayData.completed_at).toLocaleTimeString()}`}
            </p>
          )}
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--color-muted-foreground)]">
            <span>Round {displayData?.current_round || 0} / {displayData?.total_rounds || 0}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-3 rounded-full transition-all duration-700 ${status === "completed" ? "bg-emerald-500" : "bg-violet-500"}`}
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Card>

      {/* live tracking — only shown while running */}
      {isLive && liveRound && (
        <Card className="space-y-3 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Live — Round {liveRound.round}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Image Acc",    value: liveRound.image_accuracy    != null ? `${liveRound.image_accuracy}%`    : "—" },
              { label: "Clinical Acc", value: liveRound.clinical_accuracy != null ? `${liveRound.clinical_accuracy}%` : "—" },
              { label: "Fused Acc",    value: liveRound.fused_accuracy    != null ? `${liveRound.fused_accuracy}%`    : "—" },
              { label: "Image Loss",   value: liveRound.image_loss        != null ? liveRound.image_loss              : "—" },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-white border border-blue-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">{m.label}</p>
                <p className="mt-1 text-lg font-black text-blue-700">{m.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-blue-600">
            Clients: {liveRound.clients} · {liveRound.timestamp ? new Date(liveRound.timestamp).toLocaleTimeString() : ""}
          </p>
        </Card>
      )}

      {/* metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Rounds"      value={displayData?.total_rounds    || "—"} />
        <MetricCard label="Completed Rounds"  value={displayData?.current_round   ?? 0}   />
        <MetricCard label="Best Accuracy"     value={displayData?.best_accuracy ? `${displayData.best_accuracy}%` : "—"} accent />
        <MetricCard label="Clients Connected" value={displayData?.clients_connected ?? 0} sub="hospital nodes" />
      </div>

      {/* model weights */}
      {data?.weights && <WeightsPanel weights={data.weights} />}

      {/* hospital nodes + scan log */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--color-primary)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Hospital Nodes &amp; Scan Log</p>
          <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            {scanLog.length} total scan{scanLog.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-2">
          {displayHospitals.map((h, i) => (
            <HospitalWithScans key={h.id} hospital={h} index={i}
              scans={scanLog.filter(s => s.hospital === h.id)}
              search={searchQuery} />
          ))}
        </div>
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
          🔒 Raw patient data never leaves each hospital node. Only model weight gradients are shared.
        </p>
      </Card>

      {/* training chart */}
      <Card className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Training Metrics per Round</p>
        <DualChart rounds={rounds} />
      </Card>

      {/* round history table */}
      <Card className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Round History</p>
        {rounds.length > 0
          ? <RoundTable rounds={rounds} />
          : (
            <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-muted-foreground)]">Round history will appear here once training starts.</p>
            </div>
          )
        }
      </Card>

    </div>
  );
}
