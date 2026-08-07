import { apiFetch } from "./client";

export function normalizePredictionResponse(data) {
  const probabilities = data?.probabilities || {};

  return {
    prediction: data?.prediction || "unknown",
    confidence: Number(data?.confidence || 0),
    probabilities: {
      normal: Number(probabilities.normal || 0),
      pcos: Number(probabilities.pcos || 0),
    },
    model: data?.model || "ResNet-50 PCOS Classifier",
    analysisType: data?.analysisType || "Ultrasound image",
    raw: data,
  };
}

export async function predictPCOS(image) {
  const formData = new FormData();
  formData.append("file", image);

  const data = await apiFetch("/predict", {
    method: "POST",
    body: formData,
  });

  return normalizePredictionResponse(data);
}
