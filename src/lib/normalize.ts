import type { Survey } from '@/types/survey'

/**
 * Firebase omits null values, empty arrays, and empty objects on write.
 * This function restores all expected defaults so components never crash
 * when accessing fields that Firebase may have stripped out.
 */
export function normalizeSurvey(survey: Survey): Survey {
  const sections = survey.sections ?? {}
  const normalizedSections: typeof sections = {}
  for (const [id, section] of Object.entries(sections)) {
    normalizedSections[id] = {
      ...section,
      questionOrder: section.questionOrder ?? [],
      branchRules: section.branchRules ?? [],
    }
  }

  const questions = survey.questions ?? {}
  const normalizedQuestions: typeof questions = {}
  for (const [id, question] of Object.entries(questions)) {
    normalizedQuestions[id] = {
      ...question,
      options: question.options ?? [],
    }
  }

  return {
    ...survey,
    sectionOrder: survey.sectionOrder ?? [],
    identificationFields: survey.identificationFields ?? [],
    schedule: {
      openAt: survey.schedule?.openAt ?? null,
      closeAt: survey.schedule?.closeAt ?? null,
    },
    resultConfig: {
      showScore: survey.resultConfig?.showScore ?? true,
      ranges: survey.resultConfig?.ranges ?? [],
    },
    emailConfig: {
      enabled: survey.emailConfig?.enabled ?? false,
      subject: survey.emailConfig?.subject ?? '',
      bodyHtml: survey.emailConfig?.bodyHtml ?? '',
      imageUrl: survey.emailConfig?.imageUrl,
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
  }
}
