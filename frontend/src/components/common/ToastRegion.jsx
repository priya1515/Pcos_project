const toneStyles = {
  info: "border-cyan-200 bg-cyan-50 text-cyan-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

function ToastRegion({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border px-4 py-3 shadow-[var(--shadow-card)] ${toneStyles[toast.tone] || toneStyles.info}`}
        >
          <p className="text-sm font-semibold">{toast.title}</p>
          <p className="mt-1 text-sm opacity-80">{toast.description}</p>
        </div>
      ))}
    </div>
  );
}

export default ToastRegion;
