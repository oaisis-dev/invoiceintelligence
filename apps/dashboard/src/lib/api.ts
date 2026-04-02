import type { ApiResponse } from "@/types/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseError(res: Response): Promise<string> {
  try {
    const payload = await res.json();
    const message = payload?.error?.message ?? payload?.detail ?? JSON.stringify(payload);
    return typeof message === "string" ? message : JSON.stringify(message);
  } catch {
    return res.text();
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const message = await parseError(res);
    throw new Error(`API ${res.status}: ${message}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}
