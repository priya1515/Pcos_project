export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getPredictionMeta(prediction) {
  const isPCOS = prediction === "pcos";

  return {
    tone: isPCOS ? "warning" : "success",
    label: isPCOS ? "PCOS indicators" : "Normal indicators",
    summary: isPCOS ? "PCOS Indicators Detected" : "Normal Indicators Detected",
  };
}

export function validateImageFile(file) {
  if (!file) {
    return "Please upload an ultrasound image.";
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Unsupported image. Please upload a JPG, JPEG, or PNG ultrasound image.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image is too large. Please upload a file smaller than 10 MB.";
  }

  return null;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}
