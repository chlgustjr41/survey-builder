import type { Question } from '@/types/question'
import type { Answer, Response } from '@/types/response'
import type { ScoreRange } from '@/types/survey'

export function calculateAnswerScore(answer: Answer, question: Question): number {
  if (!question.options) return 0

  if (question.type === 'radio') {
    const selected = question.options.find(o => o.id === answer.value)
    return selected?.points ?? 0
  }

  if (question.type === 'checkbox' && Array.isArray(answer.value)) {
    return answer.value.reduce((sum, optId) => {
      const opt = question.options?.find(o => o.id === optId)
      return sum + (opt?.points ?? 0)
    }, 0)
  }

  if (question.type === 'rating' && typeof answer.value === 'number') {
    return answer.value
  }

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

export function matchScoreRange(
  score: number,
  ranges: ScoreRange[]
): ScoreRange | null {
  return ranges.find(r => score >= r.min && score <= r.max) ?? null
}

export function getMaxPossibleScore(questions: Record<string, Question>): number {
  return Object.values(questions).reduce((total, q) => {
    if (!q.options || q.options.length === 0) return total
    const max = Math.max(...q.options.map(o => o.points))
    return total + max
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
