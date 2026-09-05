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

export async function predictClinical(clinicalFields) {
  const data = await apiFetch("/predict/clinical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clinicalFields),
  });

  return {
    prediction: data.prediction,
    pcos_probability: Number(data.pcos_probability || 0),
    normal_probability: Number(data.normal_probability || 0),
    threshold: data.threshold,
  };
}

/**
 * Sends image + 15 clinical form fields to /predict/multimodal.
 * clinicalFields: plain object with keys matching the Form(...) parameter names
 * e.g. { age, height, pulse_rate, rbs, bp_systolic, cycle_length,
 *         lh, amh, prl, vit_d3, follicle_r, follicle_l,
 *         avg_f_size_r, beta_hcg_1, beta_hcg_2 }
 */
export async function predictMultimodal(image, clinicalFields) {
  const formData = new FormData();
  formData.append("file", image);

  Object.entries(clinicalFields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const data = await apiFetch("/predict/multimodal", {
    method: "POST",
    body: formData,
  });

  return data;
}
