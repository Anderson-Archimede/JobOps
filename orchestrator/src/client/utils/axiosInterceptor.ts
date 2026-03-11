let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Use original fetch directly to avoid interceptor
    const response = await window.fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}

export function setupAxiosInterceptors() {
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Only intercept protected API routes (not auth routes)
    if (url.startsWith("/api/") && !url.includes("/api/auth/")) {
      const headers = new Headers(init?.headers || {});

      if (accessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      const requestInit = { ...init, headers };

      let response = await originalFetch(input, requestInit);

      // Handle 401 with token refresh
      if (response.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;

          const newToken = await refreshAccessToken();

          if (newToken) {
            onTokenRefreshed(newToken);
            isRefreshing = false;

            // Retry the original request with new token
            headers.set("Authorization", `Bearer ${newToken}`);
            response = await originalFetch(input, { ...init, headers });
          } else {
            isRefreshing = false;
            // Only redirect if not already on login page
            if (!window.location.pathname.startsWith("/login")) {
              window.location.href = "/login";
            }
            return response;
          }
        } else {
          // Wait for the ongoing refresh to complete
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              headers.set("Authorization", `Bearer ${token}`);
              resolve(originalFetch(input, { ...init, headers }));
            });
          });
        }
      }

      return response;
    }

    // Pass through all other requests
    return originalFetch(input, init);
  };
}
