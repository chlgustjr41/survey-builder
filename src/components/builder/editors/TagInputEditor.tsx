import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question } from '@/types/question'

interface Props { question: Question }

export default function TagInputEditor({ question }: Props) {
  const { updateQuestion } = useBuilderStore()
  const cfg = question.tagConfig ?? {}

  return (
    <div className="mt-2">
      <Input
        className="h-7 text-xs"
        placeholder="Placeholder text (e.g. Add a tag...)"
        value={cfg.placeholder ?? ''}
        onChange={(e) =>
          updateQuestion(question.id, { tagConfig: { placeholder: e.target.value } })
        }
      />
      <div className="mt-2 flex flex-wrap gap-1.5 min-h-8 bg-gray-50 border border-dashed border-gray-200 rounded p-2">
        <span className="text-xs text-gray-300">{cfg.placeholder || 'Tags will appear here...'}</span>
      </div>
    </div>
  )
}
