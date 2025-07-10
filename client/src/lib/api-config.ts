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
    port: window.location.port,
    hostname: window.location.hostname
  });

  // Force use of current origin for ALL cases to ensure Ultimate Deploy server is used
  // This prevents any hardcoded Firebase URLs from being used
  console.log('[API_CONFIG] Using current origin (Ultimate Deploy server)');
  return window.location.origin;
}