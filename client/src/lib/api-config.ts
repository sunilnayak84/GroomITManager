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

  // Force Ultimate Deploy server when running on development port
  if (window.location.port === '5000') {
    console.log('[API_CONFIG] Using Ultimate Deploy server for billing');
    return 'http://localhost:8080';
  }

  // For production deployment, use current origin
  console.log('[API_CONFIG] Using current origin (production deployment)');
  return window.location.origin;
}