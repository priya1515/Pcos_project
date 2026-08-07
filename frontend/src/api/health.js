import { apiFetch } from "./client";

export async function getHealthStatus() {
  const data = await apiFetch("/health");

  return {
    status: data?.status || "unknown",
    model: data?.model || "Unknown model",
    checkedAt: Date.now(),
  };
}
