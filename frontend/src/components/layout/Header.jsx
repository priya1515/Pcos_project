import { Menu, RefreshCw, Search } from "lucide-react";
import Button from "../common/Button";
import StatusBadge from "../common/StatusBadge";

function Header({ title, subtitle, health, onOpenSidebar, onRefreshHealth }) {
  const online = health.status === "ok";

  return (
    <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6 bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-subtle)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-foreground)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Good morning</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] md:flex">
            <Search className="h-4 w-4 text-[var(--color-primary)]" />
            Search scans, reports, or model status
          </div>
          <Button variant="secondary" className="px-3" onClick={onRefreshHealth} aria-label="Refresh service status">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{subtitle}</p>
        <StatusBadge tone={online ? "success" : "danger"}>
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden="true" />
          {online ? "AI Service Online" : "AI Service Offline"}
        </StatusBadge>
      </div>
    </header>
  );
}

export default Header;
