import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import RecentScans from "../components/dashboard/RecentScans";
import StatCard from "../components/dashboard/StatCard";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import { useAppContext } from "../context/useAppContext";

function Dashboard() {
  const { scans } = useAppContext();

  const stats = {
    total: scans.length,
    pcos: scans.filter((scan) => scan.prediction === "pcos").length,
    normal: scans.filter((scan) => scan.prediction === "normal").length,
    averageConfidence:
      scans.length > 0 ? scans.reduce((sum, scan) => sum + scan.confidence, 0) / scans.length : 0,
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        {/* Hero card */}
        <Card className="overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e3a5f_60%,#1a4a7a_100%)] text-white">
          <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#38bdf8]">FemWell</p>
          <h3 className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.04em] leading-snug">
            AI-assisted PCOS screening from ovarian ultrasound.
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Upload ultrasound scans, review model outputs, compare saved screenings, and export reports.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button as={Link} to="/new-scan" className="bg-[#38bdf8] text-slate-950 font-bold hover:bg-[#7dd3fc]">
              <Plus className="h-4 w-4" />
              New Scan
            </Button>
            <Button as={Link} to="/history" variant="ghost" className="border-2 border-white/40 text-white font-bold hover:bg-white hover:text-slate-950">
              View History
            </Button>
          </div>
        </Card>

        {/* Workflow card */}
        <Card className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Workflow</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">How it works</h3>
          </div>
          {["Upload Ultrasound", "Enter Clinical Data", "Run Analysis", "Review Results", "Save & Export"].map((step, i) => (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">{step}</span>
              <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </div>
          ))}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Scans"        value={stats.total}  helper={stats.total  ? "Saved in local history"   : "No scans yet"} accent="bg-slate-800" />
        <StatCard label="PCOS Indicators"    value={stats.pcos}   helper={stats.pcos   ? "Detected in saved scans"  : "No scans yet"} accent="bg-amber-500" />
        <StatCard label="Normal"             value={stats.normal} helper={stats.normal ? "Normal predictions"       : "No scans yet"} accent="bg-emerald-500" />
        <StatCard
          label="Avg. Confidence"
          value={stats.total ? `${stats.averageConfidence.toFixed(1)}%` : "—"}
          helper={stats.total ? "Across analyzed scans" : "No scans yet"}
          accent="bg-cyan-500"
        />
      </section>

      {scans.length ? (
        <RecentScans scans={scans.slice(0, 5)} />
      ) : (
        <EmptyState
          title="No scans yet"
          description="Upload your first ovarian ultrasound image to start building scan history, metrics, and comparisons."
          actionLabel="New Scan"
          actionHref="/new-scan"
        />
      )}
    </div>
  );
}

export default Dashboard;
