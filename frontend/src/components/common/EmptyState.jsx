import Button from "./Button";

function EmptyState({ title, description, actionLabel, actionHref }) {
  return (
    <div className="rounded-[24px] border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-surface-subtle)] px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]">
        <span className="text-2xl">🔬</span>
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted-foreground)]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button as="a" href={actionHref} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
