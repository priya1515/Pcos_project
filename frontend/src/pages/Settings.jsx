import { useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import { useAppContext } from "../context/useAppContext";

function Settings() {
  const { health, healthError, theme, setTheme, clearHistory, exportHistory, scans } = useAppContext();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Appearance</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Switch between light and dark workspace themes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>
            Light mode
          </Button>
          <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>
            Dark mode
          </Button>
        </div>
      </Card>

      <Card className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Application</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Backend connection, current model, and service details.</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">API connection status</p>
            <div className="mt-3">
              <StatusBadge tone={health.status === "ok" ? "success" : "danger"}>
                {health.status === "ok" ? "AI Service Online" : "AI Service Offline"}
              </StatusBadge>
            </div>
            {healthError && <p className="mt-3 text-sm text-rose-600">{healthError}</p>}
          </div>
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">Model name</p>
            <p className="mt-2 font-semibold text-[var(--color-foreground)]">{health.model}</p>
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">Model version</p>
            <p className="mt-2 font-semibold text-[var(--color-foreground)]">Current backend response does not expose a version field.</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-6 xl:col-span-2">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Data</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Manage local scan history until a backend persistence API is introduced.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={exportHistory} disabled={!scans.length}>
            Export scan history
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={!scans.length}>
            Clear scan history
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        title="Clear local scan history?"
        description="This will permanently remove all saved local scan records from the browser."
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
