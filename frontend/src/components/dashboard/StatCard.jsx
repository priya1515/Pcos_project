import Card from "../common/Card";

function StatCard({ label, value, helper, accent }) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-[var(--shadow-soft)]">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} aria-hidden="true" />
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[var(--color-foreground)]">{value}</p>
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{helper}</p>
    </Card>
  );
}

export default StatCard;
