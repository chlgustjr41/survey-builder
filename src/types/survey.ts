import type { Question } from './question'

export type SurveyStatus = 'draft' | 'published' | 'locked'

export type PresetFieldKey =
  | 'name'
  | 'dob'
  | 'email'
  | 'phone'
  | 'employeeId'
  | 'studentId'
  | 'custom'

export interface IdentificationField {
  id: string
  type: 'preset' | 'custom'
  fieldKey: PresetFieldKey
  label: string
  required: boolean
}

export interface ScoreRange {
  id: string
  min: number
  max: number
  message: string
  imageUrl?: string
}

export interface ResultConfig {
  showScore: boolean
  ranges: ScoreRange[]
}

export interface EmailConfig {
  enabled: boolean
  subject: string
  bodyHtml: string
  imageUrl?: string
}

export interface SurveySchedule {
  openAt: number | null   // Unix timestamp ms
  closeAt: number | null
}

export type IndexFormat = 'none' | 'numeric' | 'alpha'

export interface FormatConfig {
  sectionIndex: IndexFormat
  questionIndex: IndexFormat
  optionIndex: IndexFormat
}

export type BranchRuleType = 'answer' | 'score'
export type ScoreOperator = 'gte' | 'lte'

export interface BranchRule {
  id: string
  type: BranchRuleType
  // answer-based
  questionId?: string
  optionId?: string
  // score-based
  threshold?: number
  operator?: ScoreOperator
  targetSectionId: string
}

export interface Section {
  id: string
  title: string
  description?: string
  resultConfig?: ResultConfig
  questionOrder: string[]
  branchRules: BranchRule[]
}

export interface Survey {
  id: string
  authorId: string
  title: string
  description: string
  status: SurveyStatus
  schedule: SurveySchedule
  formatConfig: FormatConfig
  createdAt: number
  updatedAt: number
  publishedAt: number | null
  sectionOrder: string[]
  identificationFields: IdentificationField[]
  resultConfig: ResultConfig
  emailConfig: EmailConfig
  sections: Record<string, Section>
  questions: Record<string, Question>
}

export type SurveyInput = Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>
