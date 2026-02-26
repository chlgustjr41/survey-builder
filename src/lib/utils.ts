import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { IndexFormat } from '@/types/survey'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns an index prefix string (e.g. "1." or "A.") or "" when format is 'none'. */
export function indexLabel(index: number, format: IndexFormat): string {
  if (format === 'none') return ''
  if (format === 'numeric') return `${index + 1}.`
  // alpha: A, B, C, … (wraps after Z using AA, AB, etc. for large counts)
  const code = index % 26
  const cycle = Math.floor(index / 26)
  const letter = String.fromCharCode(65 + code)
  return cycle === 0 ? `${letter}.` : `${String.fromCharCode(65 + cycle - 1)}${letter}.`
}
