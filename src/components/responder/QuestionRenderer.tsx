import type { Question } from '@/types/question'
import type { Answer } from '@/types/response'
import type { IndexFormat } from '@/types/survey'
import { indexLabel } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  question: Question
  questionIndex?: number
  questionIndexFormat?: IndexFormat
  optionIndexFormat?: IndexFormat
  value: Answer['value'] | undefined
  onChange: (value: Answer['value']) => void
  error?: string
  id?: string
}

export default function QuestionRenderer({ question, questionIndex, questionIndexFormat = 'none', optionIndexFormat = 'none', value, onChange, error, id }: Props) {
  const { t } = useTranslation()
  const prefix = questionIndex !== undefined ? indexLabel(questionIndex, questionIndexFormat) : ''

  return (
    <div
      id={id}
      className={`bg-white rounded-xl border p-5 shadow-sm transition-colors ${
        error ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'
      }`}
    >
      <p className="font-medium text-gray-900 mb-4">
        {prefix && <span className="mr-1">{prefix}</span>}
        {question.prompt}
        {question.required && <span className="text-orange-500 ml-1">*</span>}
      </p>
      <QuestionInput question={question} optionIndexFormat={optionIndexFormat} value={value} onChange={onChange} t={t} />
      {error && (
        <p className="mt-3 text-xs font-medium text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

interface QuestionInputProps {
  question: Question
  optionIndexFormat: IndexFormat
  value: Answer['value'] | undefined
  onChange: (value: Answer['value']) => void
  t: (k: string, options?: Record<string, unknown>) => string
}

function QuestionInput({ question, optionIndexFormat, value, onChange, t }: QuestionInputProps) {
  if (question.type === 'radio') {
    return (
      <div className="flex flex-col gap-2">
        {(question.options ?? []).map((opt, idx) => (
          <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${value === opt.id ? 'border-orange-500' : 'border-gray-300'}`}>
              {value === opt.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
            </div>
            <span className={`text-sm transition-colors ${value === opt.id ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
              {optionIndexFormat !== 'none' && <span className="mr-1">{indexLabel(idx, optionIndexFormat)}</span>}
              {opt.label}
            </span>
            <input type="radio" className="hidden" checked={value === opt.id} onChange={() => onChange(opt.id)} />
          </label>
        ))}
      </div>
    )
  }

  // ── Choice ────────────────────────────────────────────────────────────────
  if (question.type === 'choice') {
    const opts   = question.options ?? []
    const mode   = question.choiceConfig?.selectionMode ?? 'single'
    const minSel = question.choiceConfig?.min ?? 1
    const maxSel = question.choiceConfig?.max ?? opts.length

    if (mode === 'single') {
      return (
        <div className="flex flex-col gap-2">
          {opts.map((opt) => (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                ${value === opt.id ? 'border-orange-500' : 'border-gray-300 group-hover:border-orange-300'}`}
              >
                {value === opt.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
              </div>
              <span className={`text-sm transition-colors
                ${value === opt.id ? 'text-orange-600 font-medium' : 'text-gray-700'}`}
              >
                {opt.label}
              </span>
              <input
                type="radio"
                className="hidden"
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
              />
            </label>
          ))}
        </div>
      )
    }

    // range / multi-select
    const selected = Array.isArray(value) ? (value as string[]) : []
    const toggle   = (id: string) => {
      const next = selected.includes(id)
        ? selected.filter((v) => v !== id)
        : [...selected, id]
      onChange(next)
    }

    return (
      <div className="flex flex-col gap-2">
        {(question.options ?? []).map((opt, idx) => {
          const checked = selected.includes(opt.id)
          return (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggle(opt.id)}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                ${checked ? 'border-orange-500 bg-orange-500' : 'border-gray-300 group-hover:border-orange-300'}`}
              >
                {checked && <span className="text-white text-xs font-bold leading-none">✓</span>}
              </div>
              <span className={`text-sm ${checked ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
                {optionIndexFormat !== 'none' && <span className="mr-1">{indexLabel(idx, optionIndexFormat)}</span>}
                {opt.label}
              </span>
            </label>
          )
        })}
        <p className="text-xs text-gray-400 mt-1">
          Select {minSel === maxSel ? `exactly ${minSel}` : `${minSel}–${maxSel}`} option(s)
        </p>
      </div>
    )
  }

  // ── Scale ─────────────────────────────────────────────────────────────────
  if (question.type === 'scale') {
    const cfg     = question.scaleConfig ?? { min: 1, max: 5, useValueAsPoints: false }
    const current = typeof value === 'number' ? value : null
    const steps   = Array.from(
      { length: cfg.max - cfg.min + 1 },
      (_, i) => cfg.min + i
    )

    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-between gap-1 flex-wrap">
          {steps.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 min-w-8 py-2 rounded-lg border text-sm font-medium transition-colors
                ${current === n
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
        {(cfg.minLabel || cfg.maxLabel) && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>{cfg.minLabel}</span>
            <span>{cfg.maxLabel}</span>
          </div>
        )}
      </div>
    )
  }

  return null
}
