/**
 * API Configuration Utility
 * 
 * Centralized function to get the correct API base URL for all environments
 */

export function getApiBaseUrl(): string {
  // In development, use the proxy (empty string means same origin, proxy will handle /api routes)
  if (import.meta.env.DEV) {
    // If we have a VITE_API_URL, use it
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // Use current origin in development - Vite proxy will handle /api routes
    return window.location.origin;
  }
  
  // In production, if VITE_API_URL is empty or not set, use the current origin
  // This handles Replit deployments where frontend and backend are on the same domain
  const apiUrl = import.meta.env.VITE_API_URL;
  return apiUrl || window.location.origin;
}