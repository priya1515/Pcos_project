import Button from "./Button";

function EmptyState({ title, description, actionLabel, actionHref }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-12 text-center">
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
