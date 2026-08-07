import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/useAppContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ToastRegion from "../common/ToastRegion";

const pageMeta = {
  "/": {
    title: "PCOS Ultrasound Screening",
    subtitle: "Analyze and review ovarian ultrasound scans using the FemWell AI model.",
  },
  "/new-scan": {
    title: "New Ultrasound Scan",
    subtitle: "Upload an ovarian ultrasound image and run an AI-assisted screening analysis.",
  },
  "/history": {
    title: "Scan History",
    subtitle: "Review, filter, compare, and manage saved ultrasound screening results.",
  },
  "/compare": {
    title: "Compare Ultrasound Scans",
    subtitle: "Place two saved screenings side by side without implying clinical progression.",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Generate report exports from saved scan results and document model output cleanly.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage appearance, integration status, and local FemWell development data.",
  },
};

function AppLayout() {
  const { health, refreshHealth, toasts } = useAppContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = pageMeta[location.pathname] || {
    title: "Scan Details",
    subtitle: "Inspect a saved ultrasound screening result and related model output.",
  };

  return (
    <div className="min-h-dvh bg-[var(--color-app-bg)] text-[var(--color-foreground)]">
      <div className="mx-auto flex min-h-dvh max-w-[1600px] gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <div className={`fixed inset-0 z-40 bg-slate-950/40 transition lg:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        <div className={`fixed inset-y-0 left-0 z-50 w-[320px] p-4 transition duration-300 lg:static lg:block lg:w-[320px] lg:p-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <Sidebar health={health} onClose={() => setSidebarOpen(false)} />
        </div>
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            health={health}
            onOpenSidebar={() => setSidebarOpen(true)}
            onRefreshHealth={refreshHealth}
          />
          <Outlet />
        </main>
      </div>
      <ToastRegion toasts={toasts} />
    </div>
  );
}

export default AppLayout;
