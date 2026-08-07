import { ImageUp, X } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";

function ImageUploader({ file, previewUrl, error, onFileSelect, onRemove }) {
  function handleChange(event) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Upload an ovarian ultrasound image</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Supported formats: JPG, JPEG, PNG</p>
      </div>

      <label
        htmlFor="ultrasound-upload"
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-14 text-center transition hover:border-[var(--color-primary)] hover:bg-white"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <ImageUp className="h-7 w-7" />
        </span>
        <span className="mt-5 text-lg font-semibold text-[var(--color-foreground)]">Upload Image</span>
        <span className="mt-2 text-sm text-[var(--color-muted-foreground)]">Drag and drop an ultrasound here or browse local files.</span>
        <span className="mt-5 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-foreground)]">
          Browse Files
        </span>
        <input
          id="ultrasound-upload"
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="sr-only"
          onChange={handleChange}
        />
      </label>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}

      {file && previewUrl && (
        <div className="grid gap-5 lg:grid-cols-[280px,1fr]">
          <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-slate-100">
            <img src={previewUrl} alt="Selected ultrasound preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-5">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Ultrasound Preview</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">{file.name}</p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <Button variant="secondary" className="w-full sm:w-fit" onClick={onRemove}>
              <X className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ImageUploader;
