import { ref, set, get, push, onValue, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'
import type { Response, ResponseInput, ResponseFilters } from '@/types/response'
import { nanoid } from 'nanoid'

export async function submitResponse(input: ResponseInput): Promise<Response> {
  const id = nanoid()
  const response: Response = { id, ...input }
  await set(ref(db, `responses/${input.surveyId}/${id}`), response)
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
