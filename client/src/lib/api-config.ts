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

  // Always use current origin for Replit deployments or development
  // This ensures Ultimate Deploy server endpoints are used instead of Firebase
  const isReplitDeploy = window.location.hostname.includes('repl.run') || 
                        window.location.hostname.includes('replit.dev') ||
                        window.location.hostname.includes('sisko.prod.repl.run');
  
  if (import.meta.env.DEV || window.location.port === '5000' || isReplitDeploy) {
    console.log('[API_CONFIG] Using current origin (development or Replit deployment)');
    return window.location.origin;
  }
  
  // Only use Firebase URLs for external deployments
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  const result = apiUrl || window.location.origin;
  console.log('[API_CONFIG] Using external API:', result);
  return result;
}