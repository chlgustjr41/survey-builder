export type QuestionType =
  | 'radio'
  | 'checkbox'
  | 'text-short'
  | 'text-long'
  | 'rating'
  | 'tag-input'

export interface QuestionOption {
  id: string
  label: string
  points: number
}

export interface CheckboxConfig {
  min: number
  max: number
}

export interface RatingConfig {
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
}

export interface TagConfig {
  placeholder?: string
}

export interface Question {
  id: string
  sectionId: string
  type: QuestionType
  prompt: string
  required: boolean
  pointValue: number
  options?: QuestionOption[]          // radio / checkbox
  checkboxConfig?: CheckboxConfig     // checkbox only
  ratingConfig?: RatingConfig         // rating only
  tagConfig?: TagConfig               // tag-input only
}
