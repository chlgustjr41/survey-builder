import type { Survey } from '@/types/survey'
import type { Question } from '@/types/question'

// ── Legacy type names (still present in Firebase) ─────────────────────────────
type LegacyQuestionType =
  | 'radio'
  | 'checkbox'
  | 'text-short'
  | 'text-long'
  | 'rating'
  | 'tag-input'
  // current types (pass-through)
  | 'text'
  | 'choice'
  | 'scale'

/**
 * Migrates a single raw question from Firebase (which may use the old type
 * schema) into the current Question shape.
 *
 * Old → New mapping
 *  radio      → choice  { selectionMode: 'single' }
 *  checkbox   → choice  { selectionMode: 'range', min, max } (from checkboxConfig)
 *  text-short → text    { size: 'short' }
 *  text-long  → text    { size: 'long' }
 *  rating     → scale   { min, max, labels, useValueAsPoints: false }
 *  tag-input  → text    { size: 'long' }
 *
 * The function is also idempotent for already-migrated questions so that
 * surveys saved after the migration round-trip cleanly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateQuestion(raw: any): Question {
  const legacyType = (raw.type ?? 'text') as LegacyQuestionType

  // ── radio → choice/single ─────────────────────────────────────────────────
  if (legacyType === 'radio') {
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'choice',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      options:  (raw.options ?? []).map(normalizeOption),
      choiceConfig: { selectionMode: 'single' },
    }
  }

  // ── checkbox → choice/range ────────────────────────────────────────────────
  if (legacyType === 'checkbox') {
    const cc = raw.checkboxConfig ?? {}
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'choice',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      options:  (raw.options ?? []).map(normalizeOption),
      choiceConfig: {
        selectionMode: 'range',
        min: cc.min ?? 1,
        max: cc.max ?? 1,
      },
    }
  }

  // ── text-short → text/short ───────────────────────────────────────────────
  if (legacyType === 'text-short') {
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'text',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      textConfig: { size: 'short' },
    }
  }

  // ── text-long → text/long ─────────────────────────────────────────────────
  if (legacyType === 'text-long') {
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'text',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      textConfig: { size: 'long' },
    }
  }

  // ── rating → scale ────────────────────────────────────────────────────────
  if (legacyType === 'rating') {
    const rc = raw.ratingConfig ?? {}
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'scale',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      scaleConfig: {
        min:              rc.min  ?? 1,
        max:              rc.max  ?? 5,
        useValueAsPoints: false,
        ...(rc.minLabel ? { minLabel: rc.minLabel } : {}),
        ...(rc.maxLabel ? { maxLabel: rc.maxLabel } : {}),
      },
    }
  }

  // ── tag-input → text/long (closest equivalent) ───────────────────────────
  if (legacyType === 'tag-input') {
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'text',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      textConfig: { size: 'long' },
    }
  }

  // ── Already-migrated 'text' ───────────────────────────────────────────────
  if (legacyType === 'text') {
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'text',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      textConfig: {
        size: raw.textConfig?.size ?? 'short',
        ...(raw.textConfig?.maxLength !== undefined
          ? { maxLength: raw.textConfig.maxLength }
          : {}),
      },
    }
  }

  // ── Already-migrated 'choice' ─────────────────────────────────────────────
  if (legacyType === 'choice') {
    const cc = raw.choiceConfig ?? {}
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'choice',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      options:  (raw.options ?? []).map(normalizeOption),
      choiceConfig: {
        selectionMode: cc.selectionMode ?? 'single',
        ...(cc.min !== undefined ? { min: cc.min } : {}),
        ...(cc.max !== undefined ? { max: cc.max } : {}),
      },
    }
  }

  // ── Already-migrated 'scale' ──────────────────────────────────────────────
  if (legacyType === 'scale') {
    const sc = raw.scaleConfig ?? {}
    return {
      id:       raw.id,
      sectionId: raw.sectionId,
      type:     'scale',
      prompt:   raw.prompt ?? '',
      required: raw.required ?? false,
      scaleConfig: {
        min:              sc.min  ?? 1,
        max:              sc.max  ?? 5,
        useValueAsPoints: sc.useValueAsPoints ?? false,
        ...(sc.minLabel ? { minLabel: sc.minLabel } : {}),
        ...(sc.maxLabel ? { maxLabel: sc.maxLabel } : {}),
      },
    }
  }

  // ── Unknown type fallback → plain text ────────────────────────────────────
  return {
    id:       raw.id ?? '',
    sectionId: raw.sectionId ?? '',
    type:     'text',
    prompt:   raw.prompt ?? '',
    required: raw.required ?? false,
    textConfig: { size: 'short' },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOption(o: any) {
  return {
    id:     o.id     ?? '',
    label:  o.label  ?? '',
    points: typeof o.points === 'number' ? o.points : 0,
  }
}

/**
 * Firebase omits null values, empty arrays, and empty objects on write.
 * This function restores all expected defaults AND migrates legacy question
 * types to the current schema so components never crash on old data.
 */
export function normalizeSurvey(survey: Survey): Survey {
  const sections = survey.sections ?? {}
  const normalizedSections: typeof sections = {}
  for (const [id, section] of Object.entries(sections)) {
    normalizedSections[id] = {
      ...section,
      questionOrder: section.questionOrder ?? [],
      branchRules:   section.branchRules   ?? [],
      resultConfig: {
        showScore: section.resultConfig?.showScore ?? false,
        ranges:    section.resultConfig?.ranges    ?? [],
      },
    }
  }

  const questions = survey.questions ?? {}
  const normalizedQuestions: Record<string, Question> = {}
  for (const [id, question] of Object.entries(questions)) {
    normalizedQuestions[id] = migrateQuestion(question)
  }

  return {
    ...survey,
    sectionOrder:         survey.sectionOrder         ?? [],
    identificationFields: survey.identificationFields ?? [],
    schedule: {
      openAt:  survey.schedule?.openAt  ?? null,
      closeAt: survey.schedule?.closeAt ?? null,
    },
    resultConfig: {
      showScore: survey.resultConfig?.showScore ?? true,
      ranges:    survey.resultConfig?.ranges    ?? [],
    },
    emailConfig: {
      enabled:  survey.emailConfig?.enabled  ?? false,
      subject:  survey.emailConfig?.subject  ?? '',
      bodyHtml: survey.emailConfig?.bodyHtml ?? '',
      ...(survey.emailConfig?.imageUrl ? { imageUrl: survey.emailConfig.imageUrl } : {}),
    },
    formatConfig: {
      sectionIndex: survey.formatConfig?.sectionIndex ?? 'none',
      questionIndex: survey.formatConfig?.questionIndex ?? 'none',
      optionIndex: survey.formatConfig?.optionIndex ?? 'none',
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
  }
}
