/**
 * Maps Firebase (Auth, RTDB, Storage) error codes and generic network
 * patterns to user-friendly messages.
 *
 * getErrorMessage(err, fallback)
 *   Returns { message, detail } where:
 *   - message  → human-readable description of what went wrong
 *   - detail   → raw Firebase code / message for the secondary Sonner line
 *                (always present so the user can report it)
 *
 * Pass the result to Sonner like:
 *   const { message, detail } = getErrorMessage(err, 'Failed to save')
 *   toast.error(message, { description: detail })
 */

interface FirebaseLike {
  code?: string
  message?: string
}

function isFirebaseLike(err: unknown): err is FirebaseLike {
  return typeof err === 'object' && err !== null
}

export interface ErrorInfo {
  /** Short, user-facing sentence. */
  message: string
  /** Raw technical detail to show as Sonner description. Never empty. */
  detail: string
}

export function getErrorMessage(err: unknown, fallback: string): ErrorInfo {
  const rawCode    = isFirebaseLike(err) ? (err.code    ?? '') : ''
  const rawMessage = isFirebaseLike(err) ? (err.message ?? '') : String(err)
  const msgLower   = rawMessage.toLowerCase()

  // Build the detail line that always appears under the toast
  const detail = rawCode
    ? `${rawCode}${rawMessage ? ` — ${rawMessage.slice(0, 120)}` : ''}`
    : rawMessage.slice(0, 150) || 'No further details available.'

  // ── Auth ──────────────────────────────────────────────────────────────
  if (rawCode === 'auth/network-request-failed') {
    return { message: 'Sign-in failed — check your internet connection and try again.', detail }
  }
  if (rawCode === 'auth/popup-blocked') {
    return { message: 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.', detail }
  }
  if (rawCode === 'auth/too-many-requests') {
    return { message: 'Too many sign-in attempts. Please wait a moment, then try again.', detail }
  }
  if (rawCode === 'auth/user-disabled') {
    return { message: 'Your account has been disabled. Contact support for help.', detail }
  }
  if (rawCode === 'auth/unauthorized-domain') {
    return { message: 'Sign-in is not enabled for this domain. Contact support.', detail }
  }

  // ── Storage ───────────────────────────────────────────────────────────
  if (rawCode === 'storage/unauthorized') {
    return { message: 'Upload failed — you do not have permission. Try signing out and back in.', detail }
  }
  if (rawCode === 'storage/quota-exceeded') {
    return { message: 'Storage quota exceeded. Contact support.', detail }
  }
  if (rawCode === 'storage/invalid-format') {
    return { message: 'Unsupported file format. Please upload a JPEG, PNG, GIF, or WebP image.', detail }
  }
  if (rawCode === 'storage/canceled') {
    return { message: 'Upload was cancelled.', detail }
  }
  if (rawCode === 'storage/retry-limit-exceeded') {
    return { message: 'Upload timed out — check your internet connection and try again.', detail }
  }

  // ── Database / RTDB ───────────────────────────────────────────────────
  if (rawCode === 'PERMISSION_DENIED' || rawCode === 'permission-denied' ||
      msgLower.includes('permission_denied') || msgLower.includes('permission denied')) {
    return { message: 'Permission denied — the database rejected this write. Try signing out and back in.', detail }
  }
  if (rawCode === 'unavailable' || rawCode === 'UNAVAILABLE') {
    return { message: 'Service temporarily unavailable. Check your connection and try again.', detail }
  }
  if (msgLower.includes('cannot parse firebase url') || msgLower.includes('invalid url')) {
    return { message: 'Database configuration error — contact the app administrator.', detail }
  }
  if (msgLower.includes("couldn't serialize") || msgLower.includes('invalid data') ||
      msgLower.includes('undefined') || msgLower.includes('nan')) {
    return { message: 'The response data contained invalid values and could not be saved. Please try again.', detail }
  }

  // ── Network (message-based) ───────────────────────────────────────────
  if (
    msgLower.includes('network error') ||
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('offline') ||
    msgLower.includes('net::err_internet_disconnected')
  ) {
    return { message: `${fallback} — check your internet connection and try again.`, detail }
  }

  // ── Unknown — always surface the raw error so the user can report it ──
  return { message: fallback, detail }
}

/**
 * Returns true for errors that should be silently swallowed
 * (i.e. user intentionally dismissed a popup — not a real failure).
 */
export function isUserCancelledAuth(err: unknown): boolean {
  if (!isFirebaseLike(err)) return false
  return (
    err.code === 'auth/popup-closed-by-user' ||
    err.code === 'auth/cancelled-popup-request'
  )
}
