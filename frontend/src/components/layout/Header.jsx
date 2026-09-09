import { Menu, Search } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

function getISTGreeting() {
  // GMT+5:30 = UTC + 330 minutes
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istHour = new Date(utc + istOffset).getHours();

  if (istHour >= 5 && istHour < 12) return "Good morning";
  if (istHour >= 12 && istHour < 17) return "Good afternoon";
  if (istHour >= 17 && istHour < 21) return "Good evening";
  return "Good night";
}

function Header({ title, subtitle, health, onOpenSidebar, searchQuery, onSearchChange }) {
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {getISTGreeting()}
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">{title}</h2>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] md:flex">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search scans, reports, or model status"
            className="bg-transparent outline-none w-64 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          />
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
