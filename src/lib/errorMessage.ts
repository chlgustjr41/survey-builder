/**
 * Maps Firebase (Auth, RTDB, Storage) error codes and generic network
 * patterns to user-friendly messages.  Pass a `fallback` string that
 * describes what the app was *trying* to do — it is used when no
 * specific code match is found so the user still gets context.
 */

interface FirebaseLike {
  code?: string
  message?: string
}

function isFirebaseLike(err: unknown): err is FirebaseLike {
  return typeof err === 'object' && err !== null
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (!isFirebaseLike(err)) return fallback

  const code = err.code ?? ''
  const msg  = (err.message ?? '').toLowerCase()

  // ── Auth ────────────────────────────────────────────────────────────
  if (code === 'auth/network-request-failed') {
    return 'Sign-in failed — check your internet connection and try again.'
  }
  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many sign-in attempts. Please wait a moment, then try again.'
  }
  if (code === 'auth/user-disabled') {
    return 'Your account has been disabled. Contact support for help.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Sign-in is not enabled for this domain. Contact support.'
  }

  // ── Storage ─────────────────────────────────────────────────────────
  if (code === 'storage/unauthorized') {
    return 'Upload failed — you do not have permission. Try signing out and back in.'
  }
  if (code === 'storage/quota-exceeded') {
    return 'Storage quota exceeded. Contact support.'
  }
  if (code === 'storage/invalid-format') {
    return 'Unsupported file format. Please upload a JPEG, PNG, GIF, or WebP image.'
  }
  if (code === 'storage/canceled') {
    return 'Upload was cancelled.'
  }
  if (code === 'storage/retry-limit-exceeded') {
    return 'Upload timed out — check your internet connection and try again.'
  }

  // ── Database / generic Firebase ─────────────────────────────────────
  if (code === 'PERMISSION_DENIED' || code === 'permission-denied') {
    return 'Permission denied — you may need to sign out and sign back in.'
  }
  if (code === 'unavailable' || code === 'UNAVAILABLE') {
    return 'Service temporarily unavailable. Check your connection and try again.'
  }

  // ── Network pattern matching (message-based) ─────────────────────────
  if (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('offline') ||
    msg.includes('net::err_internet_disconnected')
  ) {
    return `${fallback} — check your internet connection and try again.`
  }

  return fallback
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
