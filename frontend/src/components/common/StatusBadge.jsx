const tones = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  info: "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200",
};

function StatusBadge({ children, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default StatusBadge;
