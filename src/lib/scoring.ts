import type { Question } from '@/types/question'
import type { Answer, Response } from '@/types/response'
import type { ScoreRange } from '@/types/survey'

export function calculateAnswerScore(answer: Answer, question: Question): number {
  // ── Choice: points live at option level ─────────────────────────────────────
  if (question.type === 'choice') {
    if (!question.options || question.options.length === 0) return 0

    const mode = question.choiceConfig?.selectionMode ?? 'single'

    if (mode === 'single') {
      // value is the selected option id (string)
      const selected = question.options.find((o) => o.id === answer.value)
      return selected?.points ?? 0
    } else {
      // range mode — value is an array of selected option ids
      if (!Array.isArray(answer.value)) return 0
      return answer.value.reduce((sum, optId) => {
        const opt = question.options?.find((o) => o.id === optId)
        return sum + (opt?.points ?? 0)
      }, 0)
    }
  }

  // ── Scale: selected value IS the points when useValueAsPoints is true ───────
  if (question.type === 'scale') {
    if (question.scaleConfig?.useValueAsPoints && typeof answer.value === 'number') {
      return answer.value
    }
    return 0
  }

  // ── Text: no scoring ────────────────────────────────────────────────────────
  return 0
}

export function calculateTotalScore(
  answers: Record<string, Answer>,
  questions: Record<string, Question>
): number {
  return Object.values(answers).reduce((total, answer) => {
    const question = questions[answer.questionId]
    if (!question) return total
    return total + calculateAnswerScore(answer, question)
  }, 0)
}

/** Returns the first matching range (kept for legacy callers). */
export function matchScoreRange(
  score: number,
  ranges: ScoreRange[]
): ScoreRange | null {
  return ranges.find((r) => score >= r.min && score <= r.max) ?? null
}

/** Returns ALL ranges whose [min, max] window contains the score, in definition order. */
export function matchAllScoreRanges(
  score: number,
  ranges: ScoreRange[]
): ScoreRange[] {
  return ranges.filter((r) => score >= r.min && score <= r.max)
}

export function getMaxPossibleScore(questions: Record<string, Question>): number {
  return Object.values(questions).reduce((total, q) => {
    // Choice: max is the highest single option point value
    if (q.type === 'choice' && q.options && q.options.length > 0) {
      const max = Math.max(...q.options.map((o) => o.points))
      return total + (max > 0 ? max : 0)
    }
    // Scale: max is the top of the scale when useValueAsPoints is on
    if (q.type === 'scale' && q.scaleConfig?.useValueAsPoints) {
      return total + (q.scaleConfig.max ?? 5)
    }
    return total
  }, 0)
}

export function isSurveyOpen(
  status: string,
  schedule: { openAt: number | null; closeAt: number | null }
): { open: boolean; reason?: 'locked' | 'not-started' | 'ended' } {
  const now = Date.now()

  if (status === 'locked') return { open: false, reason: 'locked' }
  if (status === 'draft') return { open: false, reason: 'locked' }

  if (schedule.openAt && now < schedule.openAt) {
    return { open: false, reason: 'not-started' }
  }
  if (schedule.closeAt && now > schedule.closeAt) {
    return { open: false, reason: 'ended' }
  }

  return { open: true }
}

export function resolveBranchTarget(
  sectionId: string,
  survey: { sections: Record<string, { branchRules: Array<{ type: string; questionId?: string; optionId?: string; threshold?: number; operator?: string; targetSectionId: string }> }> },
  answers: Record<string, Answer>,
  runningScore: number
): string | null {
  const section = survey.sections[sectionId]
  if (!section) return null

  for (const rule of section.branchRules) {
    if (rule.type === 'answer' && rule.questionId && rule.optionId) {
      const answer = answers[rule.questionId]
      if (!answer) continue
      const selected = Array.isArray(answer.value)
        ? answer.value.includes(rule.optionId)
        : answer.value === rule.optionId
      if (selected) return rule.targetSectionId
    }

    if (rule.type === 'score' && rule.threshold !== undefined) {
      const matches =
        rule.operator === 'gte'
          ? runningScore >= rule.threshold
          : runningScore <= rule.threshold
      if (matches) return rule.targetSectionId
    }
  }

  return null
}

export function buildResponseSummary(response: Response): {
  totalScore: number
  answerCount: number
} {
  return {
    totalScore: response.totalScore,
    answerCount: Object.keys(response.answers).length,
  }
}
