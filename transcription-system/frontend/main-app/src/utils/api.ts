/**
 * Get the API base URL for the current environment
 * This centralizes API URL configuration and handles both localhost and production
 */
export function getApiUrl(): string {
  // In production (Digital Ocean), nginx handles routing so we use the same domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // On production, we just use the same domain since nginx proxies /api to backend
    return '';  // Empty string means use same origin
  }
  
  // Use environment variables with fallback for localhost
  return process.env.NEXT_PUBLIC_API_URL || 
         process.env.NEXT_PUBLIC_API_BASE_URL || 
         'http://localhost:5000';
}

/**
 * Build a full API endpoint URL
 * @param endpoint - The API endpoint path (e.g., '/api/auth/login')
 * @returns The full URL for the API endpoint
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  // Ensure the endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}