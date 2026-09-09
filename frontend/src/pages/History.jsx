import { useEffect, useMemo, useState } from "react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import ScanFilters from "../components/history/ScanFilters";
import ScanTable from "../components/history/ScanTable";
import { useAppContext } from "../context/useAppContext";
import { apiFetch } from "../api/client";

const PAGE_SIZE = 10;

function History() {
  const { scans, removeScan, refreshScans, searchQuery } = useAppContext();

  const [filters, setFilters] = useState({ search: "", prediction: "all", date: "", sort: "newest" });
  const [page, setPage] = useState(1);
  const [hospitalLogs, setHospitalLogs] = useState([]);

  useEffect(() => {
    refreshScans();
    apiFetch("/federated/scans")
      .then((r) => setHospitalLogs(r.scans || []))
      .catch(() => setHospitalLogs([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scansWithHospitals = useMemo(() => {
    const available = [...hospitalLogs];
    return scans.map((scan) => {
      if (scan.hospital) return scan;
      const candidates = available
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.fileName === scan.fileName && entry.hospital);
      if (!candidates.length) return scan;
      const scanTime = new Date(scan.createdAt).getTime();
      const closest = candidates.reduce((best, c) =>
        Math.abs(new Date(c.entry.timestamp).getTime() - scanTime) <
        Math.abs(new Date(best.entry.timestamp).getTime() - scanTime) ? c : best
      );
      available.splice(closest.index, 1);
      return { ...scan, hospital: closest.entry.hospital };
    });
  }, [hospitalLogs, scans]);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  useEffect(() => { setPage(1); }, [searchQuery]);

  const filteredScans = useMemo(() => {
    const q = (searchQuery || filters.search).toLowerCase();
    return scansWithHospitals
      .filter((s) => {
        const matchSearch = !q || s.id.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q);
        const matchPred = filters.prediction === "all" || s.prediction === filters.prediction;
        const matchDate = !filters.date || s.createdAt.slice(0, 10) === filters.date;
        return matchSearch && matchPred && matchDate;
      })
      .sort((a, b) =>
        filters.sort === "newest"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt)
      );
  }, [filters, scansWithHospitals, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredScans.length / PAGE_SIZE));
  const pagedScans = filteredScans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!scans.length) {
    return (
      <EmptyState
        title="No scans yet"
        description="Upload your first ultrasound to begin building your scan history."
        actionLabel="New Scan"
        actionHref="/new-scan"
      />
    );
  }

  return (
    <Card className="space-y-6">
      <ScanFilters filters={filters} onChange={updateFilter} />

      <ScanTable
        scans={pagedScans}
        onDelete={removeScan}
      />

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-foreground)]">
        <p>Showing {pagedScans.length} of {filteredScans.length} scans</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}

export default History;
