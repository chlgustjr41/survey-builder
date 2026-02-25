import { ref, set, get, onValue, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'
import type { Response, ResponseInput, ResponseFilters } from '@/types/response'
import { nanoid } from 'nanoid'

/**
 * Firebase RTDB rejects writes that contain `undefined` values, NaN, or
 * Infinity.  Run the payload through JSON round-trip to strip them before
 * sending, then validate key fields so we throw a clear error locally instead
 * of getting an opaque Firebase rejection.
 */
function sanitizeForFirebase<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value !== value) return 0           // NaN → 0
    if (value === Infinity) return 0        // Infinity → 0
    if (value === -Infinity) return 0       // -Infinity → 0
    return value                            // undefined stripped by JSON.stringify
  })) as T
}

function assertValidSubmission(input: ResponseInput): void {
  if (!input.surveyId || typeof input.surveyId !== 'string') {
    throw new Error('Invalid submission: surveyId is missing or not a string.')
  }
  if (!input.respondedAt || typeof input.respondedAt !== 'number') {
    throw new Error('Invalid submission: respondedAt timestamp is missing.')
  }
  if (typeof input.totalScore !== 'number' || isNaN(input.totalScore)) {
    throw new Error('Invalid submission: totalScore is not a valid number.')
  }
}

export async function submitResponse(input: ResponseInput): Promise<Response> {
  assertValidSubmission(input)
  const id = nanoid()
  const response: Response = { id, ...input }
  const sanitized = sanitizeForFirebase(response)
  await set(ref(db, `responses/${sanitized.surveyId}/${id}`), sanitized)
  return response
}

export async function getResponses(
  surveyId: string,
  filters?: ResponseFilters
): Promise<Response[]> {
  const snap = await get(ref(db, `responses/${surveyId}`))
  if (!snap.exists()) return []
  let responses = Object.values(snap.val() as Record<string, Response>)

  if (filters) {
    if (filters.scoreMin !== undefined) {
      responses = responses.filter((r) => r.totalScore >= filters.scoreMin!)
    }
    if (filters.scoreMax !== undefined) {
      responses = responses.filter((r) => r.totalScore <= filters.scoreMax!)
    }
    if (filters.dateFrom !== undefined) {
      responses = responses.filter((r) => r.respondedAt >= filters.dateFrom!)
    }
    if (filters.dateTo !== undefined) {
      responses = responses.filter((r) => r.respondedAt <= filters.dateTo!)
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      responses = responses.filter((r) =>
        Object.values(r.identification).some((v) => v.toLowerCase().includes(q))
      )
    }
  }

  return responses.sort((a, b) => b.respondedAt - a.respondedAt)
}

export function subscribeToResponses(
  surveyId: string,
  cb: (responses: Response[]) => void
): Unsubscribe {
  return onValue(ref(db, `responses/${surveyId}`), (snap) => {
    if (!snap.exists()) { cb([]); return }
    const responses = Object.values(snap.val() as Record<string, Response>)
    cb(responses.sort((a, b) => b.respondedAt - a.respondedAt))
  })
}

export async function getResponseById(
  surveyId: string,
  responseId: string
): Promise<Response | null> {
  const snap = await get(ref(db, `responses/${surveyId}/${responseId}`))
  if (!snap.exists()) return null
  return snap.val() as Response
}
