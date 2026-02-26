import { useBuilderStore } from '@/stores/builderStore'
import type { Question } from '@/types/question'

interface Props { question: Question }

export default function TextEditor({ question }: Props) {
  const { updateQuestion } = useBuilderStore()
  const cfg = question.textConfig ?? { size: 'short' }
  const isLong = cfg.size === 'long'

  return (
    <div className="flex flex-col gap-3 mt-2">
      {/* Size segmented control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">Field size</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => updateQuestion(question.id, { textConfig: { ...cfg, size: 'short' } })}
            className={`px-3 py-1.5 transition-colors ${
              !isLong
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            Short
          </button>
          <button
            type="button"
            onClick={() => updateQuestion(question.id, { textConfig: { ...cfg, size: 'long' } })}
            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
              isLong
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            Long
          </button>
        </div>
      </div>

      {/* Preview of what the responder will see */}
      {isLong ? (
        <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-3 py-2 h-20 text-xs text-gray-400 resize-y overflow-auto">
          Long answer… (responder can resize)
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-3 py-2 h-8 text-xs text-gray-400 flex items-center">
          Short answer…
        </div>
      )}

      {/* No points — text questions are not scored */}
      <p className="text-[10px] text-gray-400 italic">Text questions do not contribute to the score.</p>
    </div>
  )
}
