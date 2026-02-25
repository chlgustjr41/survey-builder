import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question, QuestionType } from '@/types/question'
import RadioEditor from './editors/RadioEditor'
import CheckboxEditor from './editors/CheckboxEditor'
import TextEditor from './editors/TextEditor'
import RatingEditor from './editors/RatingEditor'
import TagInputEditor from './editors/TagInputEditor'

const TYPE_LABELS: Record<QuestionType, string> = {
  radio: 'questionType.radio',
  checkbox: 'questionType.checkbox',
  'text-short': 'questionType.text-short',
  'text-long': 'questionType.text-long',
  rating: 'questionType.rating',
  'tag-input': 'questionType.tag-input',
}

interface Props {
  question: Question
  sectionId: string
}

export default function QuestionCard({ question, sectionId }: Props) {
  const { t } = useTranslation()
  const { updateQuestion, deleteQuestion } = useBuilderStore()
  const [expanded, setExpanded] = useState(true)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Validation
  const hasEmptyPrompt = !question.prompt.trim()
  const needsOptions =
    (question.type === 'radio' || question.type === 'checkbox') &&
    (question.options ?? []).length < 2
  const hasEmptyOptionLabel = (question.options ?? []).some((o) => !o.label.trim())
  const hasIssue = hasEmptyPrompt || needsOptions || hasEmptyOptionLabel

  const warningLabel = hasEmptyPrompt
    ? 'Missing question text'
    : needsOptions
    ? 'Needs ≥ 2 options'
    : 'Empty option label'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg bg-white transition-colors ${
        hasIssue ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
      }`}
    >
      {/* Card header */}
      <div className="flex items-start gap-2 p-3">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {/* Prompt input with red underline when empty */}
          <div className={`border-b pb-0.5 ${hasEmptyPrompt ? 'border-red-300' : 'border-transparent'}`}>
            <Input
              value={question.prompt}
              onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
              placeholder={t('builder.questionPrompt')}
              className={`border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0 w-full ${
                hasEmptyPrompt ? 'placeholder:text-red-400' : ''
              }`}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <select
              value={question.type}
              onChange={(e) =>
                updateQuestion(question.id, { type: e.target.value as QuestionType })
              }
              className="text-xs text-gray-500 border-0 bg-transparent p-0 focus:outline-none cursor-pointer"
            >
              {Object.entries(TYPE_LABELS).map(([type, labelKey]) => (
                <option key={type} value={type}>{t(labelKey)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* Inline warning chip */}
          {hasIssue && (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded font-medium">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {warningLabel}
            </span>
          )}
          <span className="text-xs text-gray-400">{t('builder.required')}</span>
          <Switch
            checked={question.required}
            onCheckedChange={(v) => updateQuestion(question.id, { required: v })}
            className="scale-75"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((e) => !e)}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => deleteQuestion(sectionId, question.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Type-specific editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50">
          {question.type === 'radio' && <RadioEditor question={question} />}
          {question.type === 'checkbox' && <CheckboxEditor question={question} />}
          {(question.type === 'text-short' || question.type === 'text-long') && <TextEditor question={question} />}
          {question.type === 'rating' && <RatingEditor question={question} />}
          {question.type === 'tag-input' && <TagInputEditor question={question} />}

          {/* Points */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <label className="text-xs text-gray-500">{t('builder.points')}</label>
            <Input
              type="number"
              min={0}
              className="h-7 w-20 text-xs"
              value={question.pointValue}
              onChange={(e) => updateQuestion(question.id, { pointValue: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
