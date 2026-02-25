import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question, QuestionOption } from '@/types/question'

interface Props { question: Question }

export default function CheckboxEditor({ question }: Props) {
  const { t } = useTranslation()
  const { updateQuestion } = useBuilderStore()
  const options = question.options ?? []
  const cfg = question.checkboxConfig ?? { min: 1, max: options.length || 1 }
  const minError = cfg.min < 0 ? 'Min must be ≥ 0' : cfg.min > cfg.max ? 'Min must be ≤ max' : null
  const maxError = cfg.max < cfg.min ? 'Max must be ≥ min' : (options.length > 0 && cfg.max > options.length) ? `Max cannot exceed ${options.length} options` : null

  const updateOption = (id: string, fields: Partial<QuestionOption>) => {
    updateQuestion(question.id, {
      options: options.map((o) => (o.id === id ? { ...o, ...fields } : o)),
    })
  }

  const addOption = () => {
    updateQuestion(question.id, {
      options: [...options, { id: nanoid(), label: '', points: 0 }],
    })
  }

  const removeOption = (id: string) => {
    updateQuestion(question.id, { options: options.filter((o) => o.id !== id) })
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-gray-300 shrink-0" />
          <Input
            className="flex-1 h-7 text-xs"
            placeholder="Option label"
            value={opt.label}
            onChange={(e) => updateOption(opt.id, { label: e.target.value })}
          />
          <Input
            type="number"
            className="w-16 h-7 text-xs"
            placeholder="pts"
            value={opt.points}
            onChange={(e) => updateOption(opt.id, { points: Number(e.target.value) })}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(opt.id)}>
            <Trash2 className="w-3 h-3 text-red-400" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs text-gray-400 justify-start px-1" onClick={addOption}>
        + {t('builder.addOption')}
      </Button>

      {/* Min / max selection limits */}
      <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Select</span>
          <div className="flex flex-col">
            <Input
              type="number"
              min={0}
              className={`w-14 h-7 text-xs ${minError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              value={cfg.min}
              onChange={(e) =>
                updateQuestion(question.id, { checkboxConfig: { ...cfg, min: Number(e.target.value) } })
              }
            />
          </div>
          <span className="text-xs text-gray-400">–</span>
          <div className="flex flex-col">
            <Input
              type="number"
              min={1}
              className={`w-14 h-7 text-xs ${maxError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              value={cfg.max}
              onChange={(e) =>
                updateQuestion(question.id, { checkboxConfig: { ...cfg, max: Number(e.target.value) } })
              }
            />
          </div>
        </div>
        {(minError || maxError) && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span> {minError ?? maxError}
          </p>
        )}
      </div>
    </div>
  )
}
