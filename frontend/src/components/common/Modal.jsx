import Button from "./Button";

function Modal({ open, title, description, confirmLabel, cancelLabel = "Cancel", onConfirm, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
