import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Circle, Clock, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";
import Card from "../components/common/Card";
import { apiFetch } from "../api/client";

const POLL_INTERVAL_MS = 3000;

function StatusPill({ status }) {
  const map = {
    idle:      { label: "Idle",       cls: "bg-slate-100 text-slate-600"   },
    running:   { label: "Running",    cls: "bg-blue-100 text-blue-700 animate-pulse" },
    completed: { label: "Completed",  cls: "bg-emerald-100 text-emerald-700" },
  };
  const { label, cls } = map[status] || map.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
    </div>
  );
}

function RoundRow({ round, isLatest }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm ${isLatest ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-surface-subtle)]"}`}>
      <span className="w-16 font-semibold text-[var(--color-foreground)]">Round {round.round}</span>
      <span className="w-24 text-[var(--color-muted-foreground)]">{round.clients} clients</span>
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-2 rounded-full bg-[var(--color-primary)] transition-all duration-500"
            style={{ width: `${round.accuracy}%` }}
          />
        </div>
      </div>
      <span className="w-16 text-right font-semibold text-[var(--color-foreground)]">{round.accuracy}%</span>
      <span className="w-16 text-right text-[var(--color-muted-foreground)]">loss {round.loss}</span>
    </div>
  );
}

function HospitalNode({ hospital }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hospital.connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
        {hospital.connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">{hospital.name}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{hospital.location}</p>
      </div>
      <span className={`text-xs font-semibold ${hospital.connected ? "text-emerald-600" : "text-slate-400"}`}>
        {hospital.connected ? "Connected" : "Offline"}
      </span>
    </div>
  );
}

function AccuracyChart({ rounds }) {
  if (!rounds.length) return (
    <div className="flex h-40 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      No round data yet. Start FL training to see accuracy progress.
    </div>
  );

  const max = 100;
  const w = 600, h = 160, padL = 40, padB = 28, padT = 12, padR = 16;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const xStep = rounds.length > 1 ? chartW / (rounds.length - 1) : chartW;
  const points = rounds.map((r, i) => ({
    x: padL + (rounds.length > 1 ? i * xStep : chartW / 2),
    y: padT + chartH - (r.accuracy / max) * chartH,
    accuracy: r.accuracy,
    round: r.round,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${points[0].x},${padT + chartH} ${polyline} ${points[points.length - 1].x},${padT + chartH}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }}>
      {/* Y grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = padT + chartH - (v / max) * chartH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="var(--color-muted-foreground)">{v}%</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={area} fill="var(--color-primary)" opacity="0.08" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
          <text x={p.x} y={padT + chartH + 16} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">R{p.round}</text>
        </g>
      ))}
    </svg>
  );
}

function Federation() {
  const [data, setData]       = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError]     = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  async function fetchStatus() {
    try {
      const [status, hosp] = await Promise.all([
        apiFetch("/federated/status"),
        apiFetch("/federated/hospitals"),
      ]);
      setData(status);
      setHospitals(hosp.hospitals || []);
      setLastRefresh(new Date());
      setError("");
    } catch {
      setError("Could not reach the FL server. Make sure fl_server.py is running.");
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(() => {
      if (data?.status === "running") fetchStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data?.status]);

  const rounds       = data?.rounds || [];
  const latestRound  = rounds[rounds.length - 1];
  const progress     = data?.total_rounds ? (data.current_round / data.total_rounds) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Federated Learning</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">Training Dashboard</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Privacy-preserving distributed training across hospital nodes using FedAvg.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Status + progress */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
              <Server className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">FL Server — FedAvg Strategy</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">ResNet-50 · PCOS Ultrasound Classifier</p>
            </div>
          </div>
          <StatusPill status={data?.status || "idle"} />
        </div>

        {/* Progress bar */}
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>Round {data?.current_round || 0} of {data?.total_rounds || 0}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-2.5 rounded-full bg-[var(--color-primary)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {lastRefresh && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Clock className="h-3 w-3" />
            Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </Card>

      {/* Stat boxes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox label="Total Rounds"     value={data?.total_rounds    || "—"} />
        <StatBox label="Completed Rounds" value={data?.current_round   || 0}   />
        <StatBox label="Best Accuracy"    value={data?.best_accuracy ? `${data.best_accuracy}%` : "—"} />
        <StatBox label="Clients Connected" value={data?.clients_connected || 0} sub="hospital nodes" />
      </div>

      {/* Hospital nodes */}
      <Card className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Participating Hospital Nodes
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {hospitals.map(h => <HospitalNode key={h.id} hospital={h} />)}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-xs text-[var(--color-muted-foreground)]">
          Raw patient data never leaves each hospital node. Only model weight updates are shared with the central server.
        </div>
      </Card>

      {/* Accuracy chart */}
      <Card className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          Accuracy per Round
        </p>
        <AccuracyChart rounds={rounds} />
      </Card>

      {/* Round history */}
      {rounds.length > 0 && (
        <Card className="space-y-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
            Round History
          </p>
          <div className="space-y-1">
            {[...rounds].reverse().map((r, i) => (
              <RoundRow key={r.round} round={r} isLatest={i === 0} />
            ))}
          </div>
        </Card>
      )}

      {/* How to run */}
      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
          How to Start FL Training
        </p>
        <div className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
          <p className="font-medium text-[var(--color-foreground)]">Step 1 — Split your dataset</p>
          <pre className="rounded-xl bg-[var(--color-surface-subtle)] px-4 py-3 text-xs">python split_dataset.py --data_dir ./data --output_dir ./data/federated</pre>
          <p className="font-medium text-[var(--color-foreground)]">Step 2 — Start the FL server</p>
          <pre className="rounded-xl bg-[var(--color-surface-subtle)] px-4 py-3 text-xs">python fl_server.py --rounds 10 --min_clients 3</pre>
          <p className="font-medium text-[var(--color-foreground)]">Step 3 — Start each hospital client (3 terminals)</p>
          <pre className="rounded-xl bg-[var(--color-surface-subtle)] px-4 py-3 text-xs">{`python fl_client.py --hospital hospital_a
python fl_client.py --hospital hospital_b
python fl_client.py --hospital hospital_c`}</pre>
        </div>
      </Card>

    </div>
  );
}

export default Federation;
