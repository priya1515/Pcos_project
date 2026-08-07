import Card from "../common/Card";

function StatCard({ label, value, helper, accent }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">{value}</p>
      <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{helper}</p>
    </Card>
  );
}

export default StatCard;
