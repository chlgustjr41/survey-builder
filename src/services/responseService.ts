import { ref, set, get, onValue, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'
import type { Answer, Response, ResponseInput, ResponseFilters } from '@/types/response'
import { sanitizeForFirebase } from '@/lib/firebaseUtils'
import { nanoid } from 'nanoid'

/**
 * Restores defaults that Firebase omits on write (null values, empty objects).
 * Ensures every Response object is safe to render without null-checks at the call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeResponse(raw: any, id: string): Response {
  const answers = raw.answers ?? {}
  const normalizedAnswers: Record<string, Answer> = {}
  for (const [qid, ans] of Object.entries(answers)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = ans as any
    normalizedAnswers[qid] = {
      questionId: a.questionId ?? qid,
      value:      a.value      ?? '',
      score:      typeof a.score === 'number' ? a.score : 0,
    }
  }
  return {
    id:             raw.id             ?? id,
    surveyId:       raw.surveyId       ?? '',
    respondedAt:    typeof raw.respondedAt === 'number' ? raw.respondedAt : Date.now(),
    identification: raw.identification ?? {},
    answers:        normalizedAnswers,
    totalScore:     typeof raw.totalScore === 'number' ? raw.totalScore : 0,
    emailSent:      raw.emailSent      ?? false,
  }
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
  let responses = Object.entries(snap.val() as Record<string, unknown>).map(([id, raw]) =>
    normalizeResponse(raw, id)
  )

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
    const responses = Object.entries(snap.val() as Record<string, unknown>).map(([id, raw]) =>
      normalizeResponse(raw, id)
    )
    cb(responses.sort((a, b) => b.respondedAt - a.respondedAt))
  })
}

/**
 * Returns true if any existing response for the survey has identification
 * values that match ALL entries in the given identification map.
 */
export async function checkDuplicateIdentification(
  surveyId: string,
  identification: Record<string, string>,
): Promise<boolean> {
  const snap = await get(ref(db, `responses/${surveyId}`))
  if (!snap.exists()) return false
  const responses = Object.values(snap.val() as Record<string, Response>)
  return responses.some((r) =>
    Object.entries(identification).every(([k, v]) => r.identification?.[k] === v)
  )
}

export async function getResponseById(
  surveyId: string,
  responseId: string
): Promise<Response | null> {
  const snap = await get(ref(db, `responses/${surveyId}/${responseId}`))
  if (!snap.exists()) return null
  return snap.val() as Response
}
