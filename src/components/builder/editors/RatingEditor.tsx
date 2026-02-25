import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question } from '@/types/question'

interface Props { question: Question }

export default function RatingEditor({ question }: Props) {
  const { updateQuestion } = useBuilderStore()
  const cfg = question.ratingConfig ?? { min: 1, max: 5 }
  const rangeError = cfg.max <= cfg.min ? 'Max must be greater than min' : null

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Range</span>
          <Input
            type="number"
            className={`w-14 h-7 text-xs ${rangeError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            value={cfg.min}
            onChange={(e) => updateQuestion(question.id, { ratingConfig: { ...cfg, min: Number(e.target.value) } })}
          />
          <span className="text-xs text-gray-400">–</span>
          <Input
            type="number"
            className={`w-14 h-7 text-xs ${rangeError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            value={cfg.max}
            onChange={(e) => updateQuestion(question.id, { ratingConfig: { ...cfg, max: Number(e.target.value) } })}
          />
        </div>
        {rangeError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span> {rangeError}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          className="h-7 text-xs"
          placeholder="Min label (e.g. Poor)"
          value={cfg.minLabel ?? ''}
          onChange={(e) => updateQuestion(question.id, { ratingConfig: { ...cfg, minLabel: e.target.value } })}
        />
        <Input
          className="h-7 text-xs"
          placeholder="Max label (e.g. Excellent)"
          value={cfg.maxLabel ?? ''}
          onChange={(e) => updateQuestion(question.id, { ratingConfig: { ...cfg, maxLabel: e.target.value } })}
        />
      </div>
    </div>
  )
}
