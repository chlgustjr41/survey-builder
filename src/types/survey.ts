import type { Question } from './question'

export type SurveyStatus = 'draft' | 'published' | 'locked'

export type PresetFieldKey =
  | 'name'
  | 'dob'
  | 'gender'
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
  hideResults?: boolean   // hide the result screen from respondents entirely
  ranges: ScoreRange[]    // score-based: matched against the respondent's score
  messages?: ScoreRange[] // unconditional: always shown when scoring is disabled
}

export interface EmailConfig {
  enabled: boolean
  subject: string
  bodyHtml: string
  imageUrl?: string
}

export interface QrConfig {
  /** Firebase Storage URL of the logo embedded in the center of the QR code */
  logoUrl?: string
  /** Diameter of the logo in the QR code: sm=30px, md=50px, lg=70px */
  logoSize?: 'sm' | 'md' | 'lg'
  /** Border color of the QR card frame (hex), default '#e5e7eb' */
  borderColor?: string
  /** Corner roundness of the QR card frame, default 'md' */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg'
  /** Color of the three finder-pattern corner squares (hex), default '#000000' */
  finderColor?: string
  /** Shape of the three finder-pattern corner squares, default 'square' */
  finderShape?: 'square' | 'rounded' | 'dot'
  /** Style of the QR data dots, default 'square' */
  dotStyle?: 'square' | 'rounded' | 'dot'
  /** Color of the QR data dots (hex), default '#000000' */
  dotColor?: string
  /** Compressed data URL (JPEG ≤ 256 px) of the logo — used for canvas export.
   *  Stored alongside logoUrl so the download works without any CORS fetch. */
  logoDataUrl?: string
}

export interface SurveySchedule {
  openAt: number | null   // Unix timestamp ms
  closeAt: number | null
}

export type IndexFormat = 'none' | 'numeric' | 'alpha-lower' | 'alpha-upper'

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

export interface TextBlock {
  id: string
  sectionId: string
  content: string
}

export interface Section {
  id: string
  title: string
  description?: string
  resultConfig?: ResultConfig
  questionOrder: string[]   // may contain both question IDs and text-block IDs
  branchRules: BranchRule[]
  hidden?: boolean          // when true, section is a draft — skipped by the responder
}

export interface Survey {
  id: string
  authorId: string
  title: string
  description: string
  status: SurveyStatus
  schedule: SurveySchedule
  formatConfig: FormatConfig
  scoringDisabled?: boolean        // disable all point calculations; hides pts fields in builder
  combineResultScreens?: boolean   // skip section result screens; show one combined result at the end
  defaultLanguage?: 'en' | 'ko'   // default UI language shown to respondents
  allowDuplicates?: boolean        // when false, respondents cannot submit more than once per identification
  createdAt: number
  updatedAt: number
  publishedAt: number | null
  sectionOrder: string[]
  identificationFields: IdentificationField[]
  resultConfig: ResultConfig
  emailConfig: EmailConfig
  qrConfig?: QrConfig
  sections: Record<string, Section>
  questions: Record<string, Question>
  textBlocks?: Record<string, TextBlock>
}

export type SurveyInput = Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>
