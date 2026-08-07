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
      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,#0f172a,#1e3a5f)] text-white">
          <p className="text-sm text-cyan-100">FemWell</p>
          <h3 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em]">AI-assisted screening based on ovarian ultrasound images.</h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
            A professional workspace for uploading ultrasound scans, reviewing model outputs, comparing saved screenings, and preparing future-ready reporting flows.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as={Link} to="/new-scan" className="bg-white text-slate-950 hover:bg-slate-100">
              <Plus className="h-4 w-4" />
              New Scan
            </Button>
            <Button as={Link} to="/history" variant="ghost" className="border border-white/20 text-white hover:bg-white/10">
              View History
            </Button>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Workflow</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">Primary user journey</h3>
          </div>
          {["Dashboard", "New Scan", "Upload Ultrasound", "Analyze", "Save Scan", "History", "Compare", "Report"].map((step) => (
            <div key={step} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <span className="text-sm font-medium text-[var(--color-foreground)]">{step}</span>
              <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </div>
          ))}
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Scans" value={stats.total} helper={stats.total ? "Saved in local history" : "No scans yet"} accent="bg-slate-950" />
        <StatCard label="PCOS Indicators" value={stats.pcos} helper={stats.pcos ? "Detected in saved scans" : "No scans yet"} accent="bg-amber-500" />
        <StatCard label="Normal" value={stats.normal} helper={stats.normal ? "Normal predictions" : "No scans yet"} accent="bg-emerald-500" />
        <StatCard
          label="Average Confidence"
          value={stats.total ? `${stats.averageConfidence.toFixed(1)}%` : "0"}
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
