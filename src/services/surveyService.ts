import {
  ref,
  set,
  get,
  push,
  remove,
  update,
  query,
  orderByChild,
  equalTo,
  onValue,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'
import type { Survey, SurveyInput } from '@/types/survey'
import { nanoid } from 'nanoid'

export async function createSurvey(authorId: string): Promise<Survey> {
  const id = nanoid()
  const now = Date.now()
  const survey: Survey = {
    id,
    authorId,
    title: 'Untitled Survey',
    description: '',
    status: 'draft',
    schedule: { openAt: null, closeAt: null },
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    sectionOrder: [],
    identificationFields: [],
    resultConfig: { showScore: true, ranges: [] },
    emailConfig: { enabled: false, subject: '', bodyHtml: '' },
    sections: {},
    questions: {},
  }
  await set(ref(db, `surveys/${id}`), survey)
  return survey
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  const snap = await get(ref(db, `surveys/${id}`))
  if (!snap.exists()) return null
  return snap.val() as Survey
}

export function subscribeToSurvey(id: string, cb: (s: Survey | null) => void): Unsubscribe {
  return onValue(ref(db, `surveys/${id}`), (snap) => {
    cb(snap.exists() ? (snap.val() as Survey) : null)
  })
}

export async function getSurveysByAuthor(authorId: string): Promise<Survey[]> {
  const q = query(ref(db, 'surveys'), orderByChild('authorId'), equalTo(authorId))
  const snap = await get(q)
  if (!snap.exists()) return []
  return Object.values(snap.val() as Record<string, Survey>)
}

export function subscribeToAuthorSurveys(
  authorId: string,
  cb: (surveys: Survey[]) => void
): Unsubscribe {
  const q = query(ref(db, 'surveys'), orderByChild('authorId'), equalTo(authorId))
  return onValue(q, (snap) => {
    if (!snap.exists()) { cb([]); return }
    const surveys = Object.values(snap.val() as Record<string, Survey>)
    cb(surveys.sort((a, b) => b.updatedAt - a.updatedAt))
  })
}

export async function saveSurvey(survey: Survey): Promise<void> {
  await set(ref(db, `surveys/${survey.id}`), { ...survey, updatedAt: Date.now() })
}

export async function updateSurveyFields(
  id: string,
  fields: Partial<SurveyInput>
): Promise<void> {
  await update(ref(db, `surveys/${id}`), { ...fields, updatedAt: Date.now() })
}

export async function publishSurvey(id: string): Promise<void> {
  await update(ref(db, `surveys/${id}`), {
    status: 'published',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export async function lockSurvey(id: string): Promise<void> {
  await update(ref(db, `surveys/${id}`), { status: 'locked', updatedAt: Date.now() })
}

export async function unlockSurvey(id: string): Promise<void> {
  await update(ref(db, `surveys/${id}`), { status: 'published', updatedAt: Date.now() })
}

export async function deleteSurvey(id: string): Promise<void> {
  await Promise.all([remove(ref(db, `surveys/${id}`)), remove(ref(db, `responses/${id}`))])
}
