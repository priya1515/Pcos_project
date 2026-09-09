import { Activity, BarChart3, FileText, Gauge, HelpCircle, History, Menu, Network, ScanLine, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";

const navItems = [
  { to: "/",           label: "Dashboard",         icon: Gauge     },
  { to: "/new-scan",   label: "New Scan",           icon: ScanLine  },
  { to: "/history",    label: "Scan History",       icon: History   },
  { to: "/compare",    label: "Compare Scans",      icon: BarChart3 },
  { to: "/reports",    label: "Reports",            icon: FileText  },
  { to: "/federation", label: "Federated Learning", icon: Network   },
  { to: "/help",       label: "Help",               icon: HelpCircle},
  { to: "/settings",   label: "Settings",           icon: Settings2 },
];

function Sidebar({ health, onClose }) {
  const online = health.status === "ok";

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between rounded-2xl bg-[linear-gradient(135deg,var(--color-primary-soft),transparent)] p-3 -m-1 mb-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">FemWell</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">AI Screening Suite</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] text-[var(--color-foreground)] lg:hidden"
          aria-label="Close navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-8 space-y-1" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
          >
            {({ isActive }) => (
              <span
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                }`}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isActive ? "#ffffff" : "var(--color-muted-foreground)" }}
                />
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Model status</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">{health.model}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <StatusBadge tone={online ? "success" : "danger"}>
            <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden="true" />
            {online ? "AI Service Online" : "AI Service Offline"}
          </StatusBadge>
          <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Profile</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">Research Workspace</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">AI-assisted ultrasound screening</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
