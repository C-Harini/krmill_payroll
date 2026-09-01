export const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || sessionStorage.getItem("token");
  const rawBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  const baseUrl = `${rawBase}${cleanUrl}`;
  const response = await fetch(baseUrl, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}): ${text.slice(0, 100)}`);
    }
    return text;
  }

  if (!response.ok) {
    throw new Error(data?.message || "API Error");
  }

  return data;
};
