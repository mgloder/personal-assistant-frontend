import { cookies } from 'next/headers';

/**
 * Check if the user is authenticated
 * @returns boolean indicating if the user is authenticated
 */
export function isAuthenticated(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token');
  return !!token;
}

/**
 * Get the current user's access token
 * @returns the access token or null if not authenticated
 */
export function getAccessToken(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token');
  return token?.value || null;
}

/**
 * Log out the current user by removing the access token cookie
 */
export function logout() {
  const cookieStore = cookies();
  cookieStore.delete('access_token');
} 