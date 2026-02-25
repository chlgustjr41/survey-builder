import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question, QuestionOption } from '@/types/question'

interface Props { question: Question }

export default function RadioEditor({ question }: Props) {
  const { t } = useTranslation()
  const { updateQuestion } = useBuilderStore()
  const options = question.options ?? []

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
          <div className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
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
    </div>
  )
}
