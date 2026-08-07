function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  );
}

export default Card;
