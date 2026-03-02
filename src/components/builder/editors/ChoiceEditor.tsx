import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question, QuestionOption } from '@/types/question'
import { indexLabel } from '@/lib/utils'

// Callback ref that auto-sizes a textarea to fit its content on mount
const autoResizeRef = (el: HTMLTextAreaElement | null) => {
  if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
}

interface Props { question: Question }

export default function ChoiceEditor({ question }: Props) {
  const { t } = useTranslation()
  const { draft, updateQuestion } = useBuilderStore()
  const fmt = draft?.formatConfig.optionIndex ?? 'none'
  const scoringDisabled = draft?.scoringDisabled ?? false

  const options  = question.options ?? []
  const cfg      = question.choiceConfig ?? { selectionMode: 'single' }
  const isRange  = cfg.selectionMode === 'range'
  const min      = cfg.min ?? 1
  const max      = cfg.max ?? Math.max(options.length, 1)

  // Validation
  const minError = isRange && min < 0
    ? t('builder.choice.minError')
    : isRange && min > max
    ? t('builder.choice.minError')
    : null
  const maxError = isRange && max < min
    ? t('builder.choice.maxError')
    : isRange && options.length > 0 && max > options.length
    ? t('builder.choice.maxExceedsOptions', { count: options.length })
    : null

  // ── Option helpers ─────────────────────────────────────────────────────────
  const updateOption = (id: string, fields: Partial<QuestionOption>) =>
    updateQuestion(question.id, {
      options: options.map((o) => (o.id === id ? { ...o, ...fields } : o)),
    })

  const addOption = () =>
    updateQuestion(question.id, {
      options: [...options, { id: nanoid(), label: '', points: 0 }],
    })

  const removeOption = (id: string) =>
    updateQuestion(question.id, { options: options.filter((o) => o.id !== id) })

  // ── Selection mode change ──────────────────────────────────────────────────
  const setMode = (mode: 'single' | 'range') =>
    updateQuestion(question.id, {
      choiceConfig: {
        ...cfg,
        selectionMode: mode,
        ...(mode === 'range' && { min: 1, max: Math.max(options.length, 1) }),
      },
    })

  return (
    <div className="flex flex-col gap-3 mt-2">

      {/* Selection mode segmented control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">{t('builder.choice.selection')}</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 transition-colors ${
              !isRange
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t('builder.choice.single')}
          </button>
          <button
            type="button"
            onClick={() => setMode('range')}
            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
              isRange
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t('builder.choice.multi')}
          </button>
        </div>
      </div>

      {/* Minimum options warning */}
      <AnimatePresence>
        {options.length < 2 && (
          <motion.div
            key="min-warning"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
            className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {t('builder.choice.minOptionsWarning')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options list */}
      <AnimatePresence initial={false}>
        {options.map((opt, optIndex) => (
          <motion.div
            key={opt.id}
            initial={{ opacity: 0, x: -8, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 8, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className="flex items-center gap-2 pb-0.5"
              whileHover={{ x: 1 }}
              transition={{ duration: 0.1 }}
            >
              {/* Visual indicator: circle = single, square = range */}
              {isRange
                ? <div className="w-3 h-3 rounded border-2 border-gray-300 shrink-0" />
                : <div className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              }

              {/* Option index prefix */}
              {fmt !== 'none' && (
                <span className="text-xs font-semibold text-orange-500 shrink-0 w-5 text-right">
                  {indexLabel(optIndex, fmt)}
                </span>
              )}

              {/* Label */}
              <textarea
                ref={autoResizeRef}
                className={`flex-1 text-xs rounded-md border px-2 py-1 resize-none overflow-hidden outline-none leading-snug
                  transition-colors bg-white focus:border-orange-400
                  ${!opt.label.trim() ? 'border-amber-300 placeholder:text-amber-400' : 'border-gray-200 hover:border-gray-300'}`}
                placeholder={t('builder.choice.optionLabelPlaceholder')}
                rows={1}
                value={opt.label}
                onChange={(e) => {
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                  updateOption(opt.id, { label: el.value })
                }}
              />

              {/* Points per option — hidden when scoring is disabled */}
              {!scoringDisabled && (
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    className="w-16 h-7 text-xs text-center"
                    placeholder={t('builder.pts')}
                    value={opt.points}
                    onChange={(e) => updateOption(opt.id, { points: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-400">{t('builder.pts')}</span>
                </div>
              )}

              {/* Remove — scale on hover */}
              <motion.div
                whileHover={{ scale: 1.18 }}
                whileTap={{ scale: 0.85 }}
                transition={{ duration: 0.1 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => removeOption(opt.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add option */}
      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.1 }}>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-gray-400 justify-start px-1 hover:text-orange-500 transition-colors"
          onClick={addOption}
        >
          + {t('builder.addOption')}
        </Button>
      </motion.div>

      {/* Range min / max selection limits */}
      {isRange && (
        <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{t('builder.choice.selectBetween')}</span>
            <div className="flex flex-col">
              <Input
                type="number"
                min={0}
                className={`w-14 h-7 text-xs ${minError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                value={min}
                onChange={(e) =>
                  updateQuestion(question.id, { choiceConfig: { ...cfg, min: Number(e.target.value) } })
                }
              />
            </div>
            <span className="text-xs text-gray-400">{t('builder.choice.and')}</span>
            <div className="flex flex-col">
              <Input
                type="number"
                min={1}
                className={`w-14 h-7 text-xs ${maxError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                value={max}
                onChange={(e) =>
                  updateQuestion(question.id, { choiceConfig: { ...cfg, max: Number(e.target.value) } })
                }
              />
            </div>
            <span className="text-xs text-gray-400">{t('builder.choice.options')}</span>
          </div>
          {(minError || maxError) && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {minError ?? maxError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
