/**
 * Authenticated fetch wrapper
 *
 * Automatically includes Authorization header from localStorage access_token.
 * Use this for all BFF API calls that require authentication.
 */

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
