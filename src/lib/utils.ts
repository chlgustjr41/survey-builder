import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { IndexFormat } from '@/types/survey'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a 0-based index to a formatted prefix string.
 * Returns '' when format is 'none'.
 */
export function indexLabel(index: number, format: IndexFormat): string {
  if (format === 'none') return ''
  if (format === 'numeric') return `${index + 1}.`
  const letter = String.fromCharCode(97 + (index % 26)) // a-z
  return format === 'alpha-upper' ? `${letter.toUpperCase()}.` : `${letter}.`
}
