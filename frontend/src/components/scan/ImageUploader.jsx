import { ImageUp, X } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";

function ImageUploader({ file, previewUrl, error, onFileSelect, onRemove }) {
  function handleChange(e) {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelect(f);
  }

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">Ultrasound Image</h3>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">JPG, JPEG or PNG — max 10 MB</p>
      </div>

      {!file ? (
        <label
          htmlFor="ultrasound-upload"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-12 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ImageUp className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            Drop image here or <span className="text-[var(--color-primary)]">browse</span>
          </span>
          <input id="ultrasound-upload" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" onChange={handleChange} />
        </label>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-44 w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-100 sm:w-44 sm:shrink-0">
            <img src={previewUrl} alt="Ultrasound preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-1 flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Selected file</p>
              <p className="mt-1 font-semibold text-[var(--color-foreground)] break-all">{file.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <Button variant="secondary" className="w-fit" onClick={onRemove}>
              <X className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}
    </Card>
  );
}

export default ImageUploader;
