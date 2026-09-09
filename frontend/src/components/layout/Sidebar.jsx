import { Activity, BarChart3, FileText, Gauge, HelpCircle, History, LogOut, Menu, Network, ScanLine, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import { useAppContext } from "../../context/useAppContext";

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
  const { user, logout } = useAppContext();
  const online = health.status === "ok";
  const visibleNavItems = user?.role === "admin" ? navItems : navItems.filter((item) => item.to !== "/federation");

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex shrink-0 items-center justify-between rounded-2xl bg-[linear-gradient(135deg,var(--color-primary-soft),transparent)] p-3 -m-1 mb-0">
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

      <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Primary">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
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

      <div className="mt-6 shrink-0 space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Model status</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">{health.model}</p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <StatusBadge tone={online ? "success" : "danger"}>
            <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden="true" />
            {online ? "AI Service Online" : "AI Service Offline"}
          </StatusBadge>
          <Activity className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Profile</p>
          <p className="mt-2 text-sm font-semibold capitalize text-[var(--color-foreground)]">{user?.role} Workspace</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">{user?.username} account</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
