import { create } from 'zustand'
import type { Survey } from '@/types/survey'

interface SurveyState {
  surveys: Survey[]
  currentSurvey: Survey | null
  loading: boolean
  setSurveys: (surveys: Survey[]) => void
  setCurrentSurvey: (survey: Survey | null) => void
  setLoading: (loading: boolean) => void
  updateSurveyInList: (survey: Survey) => void
  removeSurveyFromList: (id: string) => void
}

export const useSurveyStore = create<SurveyState>((set) => ({
  surveys: [],
  currentSurvey: null,
  loading: false,

  setSurveys: (surveys) => set({ surveys }),
  setCurrentSurvey: (currentSurvey) => set({ currentSurvey }),
  setLoading: (loading) => set({ loading }),

  updateSurveyInList: (survey) =>
    set((state) => ({
      surveys: state.surveys.map((s) => (s.id === survey.id ? survey : s)),
    })),

  removeSurveyFromList: (id) =>
    set((state) => ({
      surveys: state.surveys.filter((s) => s.id !== id),
    })),
}))
