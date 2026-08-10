const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("biofit_token");
}

export function setToken(token: string) {
  localStorage.setItem("biofit_token", token);
}

export function clearToken() {
  localStorage.removeItem("biofit_token");
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Erro na requisição");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
