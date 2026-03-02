import type { Answer } from '@/types/response'

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface SurveySession {
  surveyId: string
  savedAt: number
  identification?: Record<string, string>
  sectionIndex: number
  answers: Record<string, Answer>
  runningScore: number
  sectionScores: Record<string, number>
}

const cacheKey = (surveyId: string) => `survey-session-${surveyId}`

export function readSession(surveyId: string): SurveySession | null {
  try {
    const raw = localStorage.getItem(cacheKey(surveyId))
    if (!raw) return null
    const data: SurveySession = JSON.parse(raw)
    if (Date.now() - data.savedAt > TTL_MS) {
      localStorage.removeItem(cacheKey(surveyId))
      return null
    }
    return data
  } catch {
    return null
  }
}

export function writeSession(
  surveyId: string,
  update: Partial<Omit<SurveySession, 'surveyId' | 'savedAt'>>,
): void {
  try {
    const existing = readSession(surveyId)
    const next: SurveySession = {
      surveyId,
      sectionIndex: 0,
      answers: {},
      runningScore: 0,
      sectionScores: {},
      ...existing,
      ...update,
      savedAt: Date.now(),
    }
    localStorage.setItem(cacheKey(surveyId), JSON.stringify(next))
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSession(surveyId: string): void {
  try {
    localStorage.removeItem(cacheKey(surveyId))
  } catch {}
}
