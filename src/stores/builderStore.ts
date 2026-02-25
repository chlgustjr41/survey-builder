import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Survey, Section, BranchRule } from '@/types/survey'
import type { Question, QuestionType } from '@/types/question'

interface BuilderState {
  draft: Survey | null
  isDirty: boolean
  isSaving: boolean

  initDraft: (survey: Survey) => void
  clearDraft: () => void
  setIsSaving: (saving: boolean) => void
  setIsDirty: (dirty: boolean) => void

  // Survey meta
  updateMeta: (fields: Partial<Pick<Survey, 'title' | 'description' | 'schedule' | 'resultConfig' | 'emailConfig' | 'identificationFields'>>) => void

  // Sections
  addSection: () => void
  updateSection: (sectionId: string, fields: Partial<Pick<Section, 'title'>>) => void
  deleteSection: (sectionId: string) => void
  reorderSections: (newOrder: string[]) => void
  addBranchRule: (sectionId: string, rule: Omit<BranchRule, 'id'>) => void
  removeBranchRule: (sectionId: string, ruleId: string) => void

  // Questions
  addQuestion: (sectionId: string, type: QuestionType) => void
  updateQuestion: (questionId: string, fields: Partial<Question>) => void
  deleteQuestion: (sectionId: string, questionId: string) => void
  reorderQuestions: (sectionId: string, newOrder: string[]) => void
  moveQuestion: (questionId: string, fromSection: string, toSection: string, newOrder: string[]) => void
}

const DEFAULT_RESULT_CONFIG = { showScore: true, ranges: [] }
const DEFAULT_EMAIL_CONFIG = { enabled: false, subject: '', bodyHtml: '' }
const DEFAULT_SCHEDULE = { openAt: null, closeAt: null }

export const useBuilderStore = create<BuilderState>((set) => ({
  draft: null,
  isDirty: false,
  isSaving: false,

  initDraft: (survey) => set({ draft: survey, isDirty: false }),
  clearDraft: () => set({ draft: null, isDirty: false }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setIsDirty: (isDirty) => set({ isDirty }),

  updateMeta: (fields) =>
    set((state) => {
      if (!state.draft) return state
      return { draft: { ...state.draft, ...fields }, isDirty: true }
    }),

  addSection: () =>
    set((state) => {
      if (!state.draft) return state
      const id = nanoid()
      const section: Section = { id, title: 'New Section', questionOrder: [], branchRules: [] }
      return {
        draft: {
          ...state.draft,
          sections: { ...state.draft.sections, [id]: section },
          sectionOrder: [...state.draft.sectionOrder, id],
        },
        isDirty: true,
      }
    }),

  updateSection: (sectionId, fields) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      return {
        draft: {
          ...state.draft,
          sections: { ...state.draft.sections, [sectionId]: { ...section, ...fields } },
        },
        isDirty: true,
      }
    }),

  deleteSection: (sectionId) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      const newQuestions = { ...state.draft.questions }
      section.questionOrder.forEach((qId) => delete newQuestions[qId])
      const newSections = { ...state.draft.sections }
      delete newSections[sectionId]
      return {
        draft: {
          ...state.draft,
          sections: newSections,
          questions: newQuestions,
          sectionOrder: state.draft.sectionOrder.filter((id) => id !== sectionId),
        },
        isDirty: true,
      }
    }),

  reorderSections: (newOrder) =>
    set((state) => {
      if (!state.draft) return state
      return { draft: { ...state.draft, sectionOrder: newOrder }, isDirty: true }
    }),

  addBranchRule: (sectionId, rule) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      const newRule: BranchRule = { id: nanoid(), ...rule }
      return {
        draft: {
          ...state.draft,
          sections: {
            ...state.draft.sections,
            [sectionId]: { ...section, branchRules: [...section.branchRules, newRule] },
          },
        },
        isDirty: true,
      }
    }),

  removeBranchRule: (sectionId, ruleId) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      return {
        draft: {
          ...state.draft,
          sections: {
            ...state.draft.sections,
            [sectionId]: {
              ...section,
              branchRules: section.branchRules.filter((r) => r.id !== ruleId),
            },
          },
        },
        isDirty: true,
      }
    }),

  addQuestion: (sectionId, type) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      const id = nanoid()
      const question: Question = {
        id,
        sectionId,
        type,
        prompt: '',
        required: false,
        pointValue: 0,
        ...(type === 'radio' || type === 'checkbox' ? { options: [] } : {}),
        ...(type === 'checkbox' ? { checkboxConfig: { min: 1, max: 1 } } : {}),
        ...(type === 'rating' ? { ratingConfig: { min: 1, max: 5 } } : {}),
        ...(type === 'tag-input' ? { tagConfig: { placeholder: 'Add a tag...' } } : {}),
      }
      return {
        draft: {
          ...state.draft,
          questions: { ...state.draft.questions, [id]: question },
          sections: {
            ...state.draft.sections,
            [sectionId]: { ...section, questionOrder: [...section.questionOrder, id] },
          },
        },
        isDirty: true,
      }
    }),

  updateQuestion: (questionId, fields) =>
    set((state) => {
      if (!state.draft) return state
      const question = state.draft.questions[questionId]
      if (!question) return state
      return {
        draft: {
          ...state.draft,
          questions: { ...state.draft.questions, [questionId]: { ...question, ...fields } },
        },
        isDirty: true,
      }
    }),

  deleteQuestion: (sectionId, questionId) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      const newQuestions = { ...state.draft.questions }
      delete newQuestions[questionId]
      return {
        draft: {
          ...state.draft,
          questions: newQuestions,
          sections: {
            ...state.draft.sections,
            [sectionId]: {
              ...section,
              questionOrder: section.questionOrder.filter((id) => id !== questionId),
            },
          },
        },
        isDirty: true,
      }
    }),

  reorderQuestions: (sectionId, newOrder) =>
    set((state) => {
      if (!state.draft) return state
      const section = state.draft.sections[sectionId]
      if (!section) return state
      return {
        draft: {
          ...state.draft,
          sections: {
            ...state.draft.sections,
            [sectionId]: { ...section, questionOrder: newOrder },
          },
        },
        isDirty: true,
      }
    }),

  moveQuestion: (questionId, fromSection, toSection, newOrder) =>
    set((state) => {
      if (!state.draft) return state
      const from = state.draft.sections[fromSection]
      const to = state.draft.sections[toSection]
      if (!from || !to) return state
      return {
        draft: {
          ...state.draft,
          questions: {
            ...state.draft.questions,
            [questionId]: { ...state.draft.questions[questionId], sectionId: toSection },
          },
          sections: {
            ...state.draft.sections,
            [fromSection]: {
              ...from,
              questionOrder: from.questionOrder.filter((id) => id !== questionId),
            },
            [toSection]: { ...to, questionOrder: newOrder },
          },
        },
        isDirty: true,
      }
    }),
}))

export { DEFAULT_RESULT_CONFIG, DEFAULT_EMAIL_CONFIG, DEFAULT_SCHEDULE }
