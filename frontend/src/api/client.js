const API_URL = import.meta.env.VITE_API_URL;

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? payload.detail || payload.message
        : payload;

    throw new Error(message || "Request failed");
  }

  return payload;
}

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error("Missing VITE_API_URL configuration.");
  }

  const response = await fetch(`${API_URL}${path}`, options);
  return parseResponse(response);
}

export { API_URL };
