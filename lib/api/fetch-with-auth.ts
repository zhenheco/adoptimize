/**
 * Authenticated fetch wrapper
 *
 * Automatically includes Authorization header from localStorage access_token.
 * On 401 response, attempts to refresh the token using the refresh_token cookie,
 * then retries the original request once.
 */

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const newToken = data.data?.access_token;

    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('access_token', newToken);
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status !== 401 || typeof window === 'undefined') {
    return response;
  }

  // 401 — attempt token refresh (deduplicate concurrent refreshes)
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = refreshAccessToken().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }

  const newToken = await refreshPromise;

  if (!newToken) {
    // Refresh failed — clear auth state and redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
    return response;
  }

  // Retry original request with new token
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${newToken}`,
    },
  });
}
