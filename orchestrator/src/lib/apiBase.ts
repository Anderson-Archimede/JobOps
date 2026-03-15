/**
 * API base URL for all backend requests.
 * - In production on Vercel: set VITE_API_ORIGIN to your backend URL (e.g. https://jobops.onrender.com)
 *   so the frontend calls the backend directly and avoids Vercel proxy timeout (120s limit).
 * - Otherwise: uses relative "/api" (same origin or Vercel rewrites).
 */

const ORIGIN =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN
    ? String(import.meta.env.VITE_API_ORIGIN).replace(/\/$/, "")
    : "";

export const API_BASE = ORIGIN ? `${ORIGIN}/api` : "/api";

export function getApiBase(): string {
  return API_BASE;
}

/** Default request timeout (ms). Prevents hanging when backend is slow or proxy times out. */
export const API_TIMEOUT_MS = 30_000;

/**
 * Fetch from API with base URL and default timeout. Use for one-off fetch() calls
 * (Dashboard, Datasets, etc.) so they work on Vercel and don't hang.
 */
export async function fetchApi(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const p = path.startsWith("http") ? path : `${API_BASE}/${path.replace(/^\//, "")}`;
  const url = p;
  const signal =
    options?.signal ??
    (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(API_TIMEOUT_MS)
      : undefined);
  return fetch(url, {
    ...options,
    signal,
    credentials: API_BASE.startsWith("http") ? "include" : options?.credentials,
  });
}
