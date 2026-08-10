import AsyncStorage from "@react-native-async-storage/async-storage";

// localhost works when running via `expo start --web`. For physical devices/simulators,
// replace with the machine's LAN IP (e.g. http://192.168.x.x:3333).
const API_URL = "http://localhost:3333";
const TOKEN_KEY = "biofit_token";

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
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
