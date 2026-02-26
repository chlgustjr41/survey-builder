import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { Question } from '@/types/question'
import type { Answer } from '@/types/response'
import type { IndexFormat } from '@/types/survey'
import { indexLabel } from '@/lib/utils'

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

  if (question.type === 'checkbox') {
    const selected = Array.isArray(value) ? value as string[] : []
    const toggle = (id: string) => {
      const next = selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]
      onChange(next)
    }
    return (
      <div className="flex flex-col gap-2">
        {(question.options ?? []).map((opt, idx) => {
          const checked = selected.includes(opt.id)
          return (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer" onClick={() => toggle(opt.id)}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                {checked && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`text-sm ${checked ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
                {optionIndexFormat !== 'none' && <span className="mr-1">{indexLabel(idx, optionIndexFormat)}</span>}
                {opt.label}
              </span>
            </label>
          )
        })}
        {question.checkboxConfig && (
          <p className="text-xs text-gray-400 mt-1">
            Select {question.checkboxConfig.min}–{question.checkboxConfig.max} options
          </p>
        )}
      </div>
    )
  }

  if (question.type === 'text-short') {
    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer"
      />
    )
  }

  if (question.type === 'text-long') {
    return (
      <Textarea
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer"
        rows={4}
        className="resize-none"
      />
    )
  }

  if (question.type === 'rating') {
    const cfg = question.ratingConfig ?? { min: 1, max: 5 }
    const current = typeof value === 'number' ? value : cfg.min
    const steps = Array.from({ length: cfg.max - cfg.min + 1 }, (_, i) => cfg.min + i)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-between gap-1">
          {steps.map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${current === n ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
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

  if (question.type === 'tag-input') {
    const tags = Array.isArray(value) ? value as string[] : []
    return <TagInput tags={tags} onChange={onChange} placeholder={question.tagConfig?.placeholder ?? t('responder.addTag')} />
  }

  return null
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 border border-gray-200 rounded-lg p-2 min-h-10 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button onClick={() => onChange(tags.filter((t) => t !== tag))}><X className="w-2.5 h-2.5" /></button>
        </Badge>
      ))}
      <input
        className="flex-1 min-w-24 text-sm outline-none bg-transparent placeholder:text-gray-300"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
