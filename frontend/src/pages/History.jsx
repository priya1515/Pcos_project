import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import ScanFilters from "../components/history/ScanFilters";
import ScanTable from "../components/history/ScanTable";
import { useAppContext } from "../context/useAppContext";

const PAGE_SIZE = 8;

function History() {
  const { scans, compareSelection, addCompareSelection, removeScan } = useAppContext();
  const [filters, setFilters] = useState({
    search: "",
    prediction: "all",
    date: "",
    sort: "newest",
  });
  const [page, setPage] = useState(1);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const filteredScans = useMemo(() => {
    const next = scans.filter((scan) => {
      const matchesSearch =
        scan.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        scan.fileName.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPrediction =
        filters.prediction === "all" ? true : scan.prediction === filters.prediction;
      const matchesDate = filters.date
        ? scan.createdAt.slice(0, 10) === filters.date
        : true;

      return matchesSearch && matchesPrediction && matchesDate;
    });

    return next.sort((first, second) =>
      filters.sort === "newest"
        ? new Date(second.createdAt) - new Date(first.createdAt)
        : new Date(first.createdAt) - new Date(second.createdAt),
    );
  }, [filters, scans]);

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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <ScanFilters filters={filters} onChange={updateFilter} />
        <Button as={Link} to="/compare" variant="secondary" className="whitespace-nowrap" disabled={compareSelection.length !== 2}>
          Compare Selected
        </Button>
      </div>

      <ScanTable
        scans={pagedScans}
        compareSelection={compareSelection}
        onToggleCompare={addCompareSelection}
        onDelete={removeScan}
      />

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-foreground)]">
        <p>
          Showing {pagedScans.length} of {filteredScans.length} scans
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default History;
