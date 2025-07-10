/**
 * API Configuration Utility
 * 
 * Centralized function to get the correct API base URL for all environments
 */

export function getApiBaseUrl(): string {
  // Debug logging to understand what environment we're in
  console.log('[API_CONFIG] Environment check:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    origin: window.location.origin,
    port: window.location.port
  });

  // Force use current origin for development to avoid hardcoded URLs
  if (import.meta.env.DEV || window.location.port === '5000') {
    console.log('[API_CONFIG] Using development mode - current origin');
    return window.location.origin;
  }
  
  // In production, check for API URL environment variables
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  const result = apiUrl || window.location.origin;
  console.log('[API_CONFIG] Using production mode:', result);
  return result;
}