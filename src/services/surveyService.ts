import {
  ref,
  set,
  get,
  remove,
  update,
  onValue,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'
import type { Survey, SurveyInput } from '@/types/survey'
import { sanitizeForFirebase } from '@/lib/firebaseUtils'
import { nanoid } from 'nanoid'

// ─────────────────────────────────────────────────────────────────────────────
// Path helpers
//
//  Full survey data  →  /surveys/{authorId}/{surveyId}
//  Public index      →  /surveyIndex/{surveyId}  { authorId }
//
// The index is small and world-readable.  Respondents use it to resolve
// the owner UID so they can read /surveys/{authorId}/{surveyId} directly
// (allowed by the child ".read" rule when status is published/locked).
// ─────────────────────────────────────────────────────────────────────────────

function surveyPath(authorId: string, surveyId: string) {
  return `surveys/${authorId}/${surveyId}`
}

function indexPath(surveyId: string) {
  return `surveyIndex/${surveyId}`
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/** Look up the owner UID for a survey via the public index. */
async function getAuthorId(surveyId: string): Promise<string | null> {
  const snap = await get(ref(db, indexPath(surveyId)))
  if (!snap.exists()) return null
  return (snap.val() as { authorId: string }).authorId
}

// ─── Public API ──────────────────────────────────────────────────────────────

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

  // Write survey data and index entry atomically via multi-path update
  await set(ref(db, surveyPath(authorId, id)), survey)
  await set(ref(db, indexPath(id)), { authorId })

  return survey
}

/** Resolve a survey by ID using the public index (works for all callers). */
export async function getSurveyById(id: string): Promise<Survey | null> {
  const authorId = await getAuthorId(id)
  if (!authorId) return null
  const snap = await get(ref(db, surveyPath(authorId, id)))
  if (!snap.exists()) return null
  return snap.val() as Survey
}

/**
 * Subscribe to a single survey.
 *
 * Internally performs a one-time index lookup then subscribes to the full
 * survey node.  Returns a synchronous unsubscribe function — safe to use
 * directly as a useEffect return value.
 */
export function subscribeToSurvey(
  id: string,
  cb: (s: Survey | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let innerUnsub: Unsubscribe | null = null
  let cancelled = false

  get(ref(db, indexPath(id)))
    .then((indexSnap) => {
      if (cancelled) return
      if (!indexSnap.exists()) { cb(null); return }
      const { authorId } = indexSnap.val() as { authorId: string }
      innerUnsub = onValue(
        ref(db, surveyPath(authorId, id)),
        (snap) => cb(snap.exists() ? (snap.val() as Survey) : null),
        (err) => {
          console.error('subscribeToSurvey failed:', err)
          cb(null)
          onError?.(err)
        }
      )
    })
    .catch((err) => {
      if (cancelled) return
      console.error('subscribeToSurvey index lookup failed:', err)
      cb(null)
      onError?.(err as Error)
    })

  return () => {
    cancelled = true
    innerUnsub?.()
  }
}

/**
 * List all surveys belonging to a user.
 * Now a simple subtree read — no orderByChild query needed.
 */
export async function getSurveysByAuthor(authorId: string): Promise<Survey[]> {
  const snap = await get(ref(db, `surveys/${authorId}`))
  if (!snap.exists()) return []
  return Object.values(snap.val() as Record<string, Survey>)
}

/**
 * Real-time subscription to all surveys owned by a user.
 * Listens to /surveys/{authorId} directly — no cross-user query required,
 * so it's both faster and more secure than the old orderByChild approach.
 */
export function subscribeToAuthorSurveys(
  authorId: string,
  cb: (surveys: Survey[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onValue(
    ref(db, `surveys/${authorId}`),
    (snap) => {
      if (!snap.exists()) { cb([]); return }
      const surveys = Object.values(snap.val() as Record<string, Survey>)
      cb(surveys.sort((a, b) => b.updatedAt - a.updatedAt))
    },
    (err) => {
      console.error('subscribeToAuthorSurveys failed:', err)
      cb([])
      onError?.(err)
    }
  )
}

/** Overwrite a survey.  Uses survey.authorId to build the path. */
export async function saveSurvey(survey: Survey): Promise<void> {
  const payload = sanitizeForFirebase({ ...survey, updatedAt: Date.now() })
  await set(ref(db, surveyPath(survey.authorId, survey.id)), payload)
}

/** Partial field update (used for quick mutations like title-only changes). */
export async function updateSurveyFields(
  id: string,
  authorId: string,
  fields: Partial<SurveyInput>
): Promise<void> {
  await update(ref(db, surveyPath(authorId, id)), { ...fields, updatedAt: Date.now() })
}

export async function publishSurvey(id: string, authorId: string): Promise<void> {
  await update(ref(db, surveyPath(authorId, id)), {
    status: 'published',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export async function lockSurvey(id: string, authorId: string): Promise<void> {
  await update(ref(db, surveyPath(authorId, id)), { status: 'locked', updatedAt: Date.now() })
}

export async function unlockSurvey(id: string, authorId: string): Promise<void> {
  await update(ref(db, surveyPath(authorId, id)), { status: 'published', updatedAt: Date.now() })
}

export async function deleteSurvey(id: string, authorId: string): Promise<void> {
  await Promise.all([
    remove(ref(db, surveyPath(authorId, id))),
    remove(ref(db, indexPath(id))),
    remove(ref(db, `responses/${id}`)),
  ])
}
