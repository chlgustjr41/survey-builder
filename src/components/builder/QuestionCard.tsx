import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal, Trash2, Copy, AlertTriangle, ChevronDown, AlignLeft, ListChecks, BarChart2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question, QuestionType } from '@/types/question'
import { indexLabel } from '@/lib/utils'
import TextEditor from './editors/TextEditor'
import ChoiceEditor from './editors/ChoiceEditor'
import ScaleEditor from './editors/ScaleEditor'

// TYPE_OPTIONS labels are resolved via t() inside the component
const TYPE_OPTIONS: { type: QuestionType; labelKey: string; icon: React.ReactNode }[] = [
  { type: 'text',   labelKey: 'questionType.text',   icon: <AlignLeft  className="w-3.5 h-3.5" /> },
  { type: 'choice', labelKey: 'questionType.choice', icon: <ListChecks className="w-3.5 h-3.5" /> },
  { type: 'scale',  labelKey: 'questionType.scale',  icon: <BarChart2  className="w-3.5 h-3.5" /> },
]

interface Props {
  question: Question
  sectionId: string
  questionIndex: number
}

export default function QuestionCard({ question, sectionId, questionIndex }: Props) {
  const { t } = useTranslation()
  const { draft, updateQuestion, deleteQuestion, duplicateQuestion, toggleQuestionVisibility } = useBuilderStore()
  const fmt = draft?.formatConfig.questionIndex ?? 'none'
  const questionPrefix = indexLabel(questionIndex, fmt)
  const [focused, setFocused] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // Dirty tracking — errors only show once the card has been interacted with
  // and focus has left it (i.e., the user "moved on").
  const [touched, setTouched] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  // Auto-resize prompt textarea whenever the value changes
  useEffect(() => {
    const el = promptRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [question.prompt])

  // ── Validation ────────────────────────────────────────────────────────────
  const hasEmptyPrompt = !question.prompt.trim()
  const needsOptions   = question.type === 'choice' && (question.options ?? []).length < 2
  const hasEmptyOption = question.type === 'choice' && (question.options ?? []).some((o) => !o.label.trim())
  const hasIssue       = hasEmptyPrompt || needsOptions || hasEmptyOption

  // Only surface validation warnings after the user has touched the card
  const showWarning = hasIssue && touched

  const warningLabel = hasEmptyPrompt
    ? t('builder.question.missingText')
    : needsOptions
    ? t('builder.question.needsOptions')
    : t('builder.question.emptyOption')

  // ── Type change: reset type-specific fields when switching category ────────
  const handleTypeChange = (newType: QuestionType) => {
    if (newType === question.type) return
    updateQuestion(question.id, {
      type: newType,
      options:      undefined,
      textConfig:   undefined,
      choiceConfig: undefined,
      scaleConfig:  undefined,
      ...(newType === 'text'   && { textConfig:   { size: 'short' } }),
      ...(newType === 'choice' && { options: [], choiceConfig: { selectionMode: 'single' } }),
      ...(newType === 'scale'  && { scaleConfig:  { min: 1, max: 5, useValueAsPoints: false } }),
    })
  }

  const currentTypeOpt = TYPE_OPTIONS.find((o) => o.type === question.type)!
  const isHidden = question.hidden ?? false

  return (
    <div
      id={`builder-question-${question.id}`}
      ref={setNodeRef}
      style={style}
      className={`rounded-xl shadow-sm border transition-all ${
        isHidden
          ? 'opacity-40 bg-gray-50 border-gray-200'
          : showWarning
          ? 'bg-white border-amber-300 ring-1 ring-amber-100'
          : focused
          ? 'bg-white border-orange-300 border-l-4 shadow-md'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setFocused(false)
          setTouched(true) // mark dirty when focus leaves the card
        }
      }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-1.5 cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors"
        {...attributes}
        {...listeners}
        title={t('builder.dragToReorder')}
      >
        <GripHorizontal className="w-5 h-5" />
      </div>

      {/* Card body */}
      <div className="px-6 pb-5 pt-1">
        {/* Question text + type selector */}
        <div className="flex gap-4 items-start mb-5">
          <div className="flex-1 min-w-0 flex items-start gap-1.5">
            {questionPrefix && (
              <span className="text-base font-semibold text-orange-500 shrink-0 pt-3 leading-snug">{questionPrefix}</span>
            )}
            <textarea
              ref={promptRef}
              value={question.prompt}
              rows={1}
              onChange={(e) => {
                updateQuestion(question.id, { prompt: e.target.value })
              }}
              placeholder={t('builder.questionPrompt')}
              className={`flex-1 text-base font-medium bg-gray-50 rounded-md px-3 pt-3 pb-2 outline-none
                border-b-2 transition-colors placeholder:text-gray-300 resize-none overflow-hidden leading-snug
                ${hasEmptyPrompt && touched && !isHidden
                  ? 'border-amber-400 bg-amber-50/40 placeholder:text-amber-300'
                  : 'border-gray-200 focus:border-orange-400 focus:bg-white hover:border-gray-300'
                }`}
            />
          </div>

          {/* Type dropdown — custom Popover with icons */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg pl-2.5 pr-2 py-2
                  text-sm text-gray-600 cursor-pointer transition-colors shrink-0 mt-1
                  focus:outline-none focus:border-orange-400 hover:border-gray-300"
              >
                {currentTypeOpt.icon}
                <span>{t(currentTypeOpt.labelKey)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="end">
              {TYPE_OPTIONS.map(({ type, labelKey, icon }) => (
                <button
                  key={type}
                  onClick={() => { handleTypeChange(type); setTypeOpen(false) }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors
                    ${question.type === type
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {icon}
                  {t(labelKey)}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Type-specific editor — always rendered; visual greyout via card opacity */}
        {question.type === 'text'   && <TextEditor   question={question} />}
        {question.type === 'choice' && <ChoiceEditor question={question} />}
        {question.type === 'scale'  && <ScaleEditor  question={question} />}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-t border-gray-100">
        {showWarning && (
          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md font-medium shrink-0">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {warningLabel}
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Required toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{t('builder.required')}</span>
            <Switch
              checked={question.required}
              onCheckedChange={(v) => updateQuestion(question.id, { required: v })}
              className="scale-[0.8] origin-center"
            />
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Visibility toggle */}
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 transition-colors ${
              isHidden ? 'text-gray-400 bg-gray-100' : 'text-gray-400 hover:text-orange-500'
            }`}
            title={isHidden ? t('builder.question.show') : t('builder.question.hide')}
            onClick={() => toggleQuestionVisibility(question.id)}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Duplicate */}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"
            title={t('builder.duplicate')}
            onClick={() => duplicateQuestion(sectionId, question.id)}
          >
            <Copy className="w-4 h-4" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
            title={t('common.delete')}
            onClick={() => deleteQuestion(sectionId, question.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
