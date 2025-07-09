/**
 * API Configuration Utility
 * 
 * Centralized function to get the correct API base URL for all environments
 */

export function getApiBaseUrl(): string {
  // In development, use the env variable if set, otherwise use localhost
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }
  
  // In production, if VITE_API_URL is empty or not set, use the current origin
  // This handles Replit deployments where frontend and backend are on the same domain
  const apiUrl = import.meta.env.VITE_API_URL;
  return apiUrl || window.location.origin;
}