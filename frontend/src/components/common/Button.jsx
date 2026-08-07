const variants = {
  primary:
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[color-mix(in_srgb,var(--color-primary),black_8%)]",
  secondary:
    "bg-white text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]",
  ghost:
    "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]",
};

function Button({
  as: Component = "button",
  children,
  className = "",
  variant = "primary",
  loading = false,
  disabled = false,
  ...props
}) {
  const sharedProps =
    Component === "button"
      ? { disabled }
      : {
          "aria-disabled": disabled,
          onClick: (event) => {
            if (disabled) {
              event.preventDefault();
              return;
            }

            props.onClick?.(event);
          },
        };

  return (
    <Component
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
      {...sharedProps}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </Component>
  );
}

export default Button;
