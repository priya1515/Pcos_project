function ScanFilters({ filters, onChange }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <input
        type="search"
        value={filters.search}
        onChange={(event) => onChange("search", event.target.value)}
        placeholder="Search by scan ID or file name"
        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none ring-0 placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
      />
      <select
        value={filters.prediction}
        onChange={(event) => onChange("prediction", event.target.value)}
        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
      >
        <option value="all">All predictions</option>
        <option value="pcos">PCOS indicators</option>
        <option value="normal">Normal indicators</option>
      </select>
      <input
        type="date"
        value={filters.date}
        onChange={(event) => onChange("date", event.target.value)}
        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
      />
      <select
        value={filters.sort}
        onChange={(event) => onChange("sort", event.target.value)}
        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}

export default ScanFilters;
