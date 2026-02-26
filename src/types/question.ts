// ── Question types ─────────────────────────────────────────────────────────────
// Three categories:
//   text   – free-text input; field size (short/long) set by builder
//   choice – options with per-option points; single or ranged multi-select
//   scale  – numeric scale; optionally uses the selected value as points

export type QuestionType = 'text' | 'choice' | 'scale'

// ── Option (choice questions only) ────────────────────────────────────────────
export interface QuestionOption {
  id: string
  label: string
  points: number   // points awarded when this option is selected
}

// ── Per-type configuration ────────────────────────────────────────────────────

/** Text question — controls the input size shown to the responder */
export interface TextConfig {
  /** 'short' → single-line input  |  'long' → resizable textarea */
  size: 'short' | 'long'
  /** Optional character limit (0 = unlimited) */
  maxLength?: number
}

/** Choice question — single select or ranged multi-select */
export interface ChoiceConfig {
  selectionMode: 'single' | 'range'
  /** Minimum selections required (range mode only) */
  min?: number
  /** Maximum selections allowed (range mode only) */
  max?: number
}

/** Scale question — numeric rating range with optional end labels */
export interface ScaleConfig {
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
  /**
   * When true the selected scale value IS the point score
   * (e.g. selecting 4 on a 1–5 scale awards 4 points).
   * When false the question contributes 0 points.
   */
  useValueAsPoints: boolean
}

// ── Question ───────────────────────────────────────────────────────────────────
export interface Question {
  id: string
  sectionId: string
  type: QuestionType
  prompt: string
  required: boolean
  // NOTE: points live at the option level for 'choice' questions,
  //       and are derived from scale value for 'scale' questions.
  //       There is NO question-level pointValue field.
  options?: QuestionOption[]     // choice only
  textConfig?: TextConfig        // text only
  choiceConfig?: ChoiceConfig    // choice only
  scaleConfig?: ScaleConfig      // scale only
}
