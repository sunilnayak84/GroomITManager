import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Indian currency (₹)
 * Example: 100000 -> ₹1,00,000.00
 */
export function formatIndianCurrency(amount: number): string {
  // Format as Indian currency with commas (e.g., ₹1,00,000.00)
  const parts = amount.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₹${parts.join('.')}`;
}

/**
 * Formats a date in Indian format (DD/MM/YYYY)
 */
export function formatIndianDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats a quantity with its unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`;
}
