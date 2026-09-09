import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun, Moon, Bell, Database, Server, Keyboard, Info,
  CheckCircle2, XCircle, RefreshCw, ExternalLink,
} from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import { useAppContext } from "../context/useAppContext";
import { API_URL } from "../api/client";

const SHORTCUTS = [
  { keys: ["Alt", "D"], desc: "Go to Dashboard",      path: "/"           },
  { keys: ["Alt", "N"], desc: "Go to New Scan",        path: "/new-scan"   },
  { keys: ["Alt", "H"], desc: "Go to Scan History",   path: "/history"    },
  { keys: ["Alt", "C"], desc: "Go to Compare Scans",  path: "/compare"    },
  { keys: ["Alt", "R"], desc: "Go to Reports",        path: "/reports"    },
  { keys: ["Alt", "F"], desc: "Go to Federation",     path: "/federation" },
  { keys: ["Alt", "?"], desc: "Go to Help",           path: "/help"       },
];

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--color-border)] pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
        <Icon className="h-4 w-4 text-[var(--color-primary)]" />
      </div>
      <div>
        <h3 className="font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--color-foreground)]">{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${checked ? "bg-[var(--color-primary)]" : "bg-slate-300 dark:bg-slate-600"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function useLocalStorageSize() {
  const [bytes, setBytes] = useState(0);
  useEffect(() => {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || "").length * 2;
    }
    setBytes(total);
  }, []);
  return bytes;
}

function Settings() {
  const { health, healthError, refreshHealth, theme, setTheme, clearHistory, exportHistory, scans } = useAppContext();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Wire keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (!e.altKey) return;
      const match = SHORTCUTS.find(s => s.keys[1].toLowerCase() === e.key.toLowerCase());
      if (match) { e.preventDefault(); navigate(match.path); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  // Preferences stored in localStorage
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem("pref_autoSave") !== "false");
  const [confirmDelete, setConfirmDelete] = useState(() => localStorage.getItem("pref_confirmDelete") !== "false");
  const [showConfidence, setShowConfidence] = useState(() => localStorage.getItem("pref_showConfidence") !== "false");

  function savePref(key, value) {
    localStorage.setItem(key, String(value));
  }

  const storageBytes = useLocalStorageSize();
  const storageKB = (storageBytes / 1024).toFixed(1);
  const pcosCount = scans.filter(s => s.prediction === "pcos").length;
  const normalCount = scans.filter(s => s.prediction === "normal").length;

  const online = health.status === "ok";

  return (
    <div className="space-y-6">

      {/* ── Appearance ── */}
      <Card className="space-y-5">
        <SectionHeading icon={Sun} title="Appearance" subtitle="Switch between light and dark workspace themes." />
        <Row label="Theme">
          <Button
            variant={theme === "light" ? "primary" : "secondary"}
            onClick={() => setTheme("light")}
            className="gap-2"
          >
            <Sun className="h-4 w-4" /> Light
          </Button>
          <Button
            variant={theme === "dark" ? "primary" : "secondary"}
            onClick={() => setTheme("dark")}
            className="gap-2"
          >
            <Moon className="h-4 w-4" /> Dark
          </Button>
        </Row>
      </Card>

      {/* ── Preferences ── */}
      <Card className="space-y-5">
        <SectionHeading icon={Bell} title="Preferences" subtitle="Control scan behaviour and UI confirmations." />
        <div className="space-y-4">
          <Row label="Show confidence score on scan cards">
            <Toggle
              checked={showConfidence}
              onChange={(v) => { setShowConfidence(v); savePref("pref_showConfidence", v); }}
            />
          </Row>
          <Row label="Confirm before deleting a scan">
            <Toggle
              checked={confirmDelete}
              onChange={(v) => { setConfirmDelete(v); savePref("pref_confirmDelete", v); }}
            />
          </Row>
          <Row label="Remind to save after analysis">
            <Toggle
              checked={autoSave}
              onChange={(v) => { setAutoSave(v); savePref("pref_autoSave", v); }}
            />
          </Row>
        </div>
      </Card>

      {/* ── Application ── */}
      <Card className="space-y-5">
        <SectionHeading icon={Server} title="Application" subtitle="Backend connection, model info, and service status." />
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 space-y-3">
            <Row label="API connection">
              <StatusBadge tone={online ? "success" : "danger"}>
                {online
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Online</>
                  : <><XCircle className="h-3.5 w-3.5" /> Offline</>
                }
              </StatusBadge>
              <Button variant="secondary" onClick={refreshHealth} className="gap-1.5 text-xs px-3 py-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </Row>
            {healthError && <p className="text-sm text-rose-600">{healthError}</p>}
            <Row label="API endpoint">
              <code className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {API_URL}
              </code>
            </Row>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 space-y-3">
            <Row label="Active model">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">{health.model || "—"}</span>
            </Row>
            <Row label="Architecture">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">Multimodal — ResNet-50 + Clinical MLP</span>
            </Row>
            <Row label="Fusion strategy">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">Equal-weight average</span>
            </Row>
          </div>
        </div>
      </Card>

      {/* ── Data ── */}
      <Card className="space-y-5">
        <SectionHeading icon={Database} title="Data Management" subtitle="All scan data is stored locally in your browser. Nothing is sent to external servers." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total scans", value: scans.length },
            { label: "PCOS detected", value: pcosCount },
            { label: "Normal", value: normalCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-center">
              <p className="text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{label}</p>
            </div>
          ))}
        </div>
        <Row label={`localStorage usage — ${storageKB} KB`}>
          <div className="h-2 w-40 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${Math.min(100, (storageBytes / (5 * 1024 * 1024)) * 100).toFixed(1)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-muted-foreground)]">of ~5 MB</span>
        </Row>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportHistory} disabled={!scans.length}>
            Export history (JSON)
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={!scans.length}>
            Clear scan history
          </Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionHeading icon={Keyboard} title="Keyboard Shortcuts" subtitle="Quick navigation shortcuts available throughout the app. Press the combination to navigate instantly." />
        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, desc, path }) => (
            <div key={desc} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-2.5">
              <span className="text-sm text-[var(--color-foreground)]">{desc}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {keys.map((k, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-foreground)] shadow-sm">
                        {k}
                      </kbd>
                      {i < keys.length - 1 && <span className="text-xs text-[var(--color-muted-foreground)]">+</span>}
                    </span>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs text-[var(--color-primary)] hover:underline gap-1"
                  onClick={() => navigate(path)}
                >
                  <ExternalLink className="h-3 w-3" /> Go
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── About ── */}
      <Card className="space-y-5">
        <SectionHeading icon={Info} title="About FemWell" subtitle="Version, technology stack, and legal disclaimer." />
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Application",  value: "FemWell AI Screening Suite" },
              { label: "Version",      value: "1.0.0" },
              { label: "Frontend",     value: "React 18 + Vite + Tailwind CSS" },
              { label: "Backend",      value: "FastAPI + PyTorch" },
              { label: "Image model",  value: "ResNet-50 (fine-tuned)" },
              { label: "Clinical model", value: "Multilayer Perceptron (MLP)" },
              { label: "Federated FL", value: "Flower (flwr) framework" },
              { label: "XAI method",   value: "Grad-CAM" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--color-foreground)]">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-800">
            FemWell is an AI-assisted research and screening tool. Results are not a medical diagnosis and must not replace evaluation by a qualified healthcare professional. Always consult a licensed clinician for diagnosis and treatment decisions.
          </div>
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        title="Clear local scan history?"
        description="This will permanently remove all saved local scan records from the browser. This action cannot be undone."
        confirmLabel="Clear history"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          clearHistory();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}

export default Settings;
