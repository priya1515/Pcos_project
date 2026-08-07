import Card from "../common/Card";

const steps = ["Preparing image...", "Running AI model...", "Generating screening result..."];

function AnalysisLoader() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-5">
        <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)]">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Analyzing ultrasound</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">This may take a few seconds.</p>
          <div className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-sm text-[var(--color-foreground)]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AnalysisLoader;
