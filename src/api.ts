export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined)
  || "/cap3/learn_with_time"
).replace(/\/$/, "");

export function apiUrl(url: string) {
  if (/^(?:https?:)?\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("data:")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(url), {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data;
}

export function fileUrl(url: string) {
  return url ? apiUrl(url) : "";
}
