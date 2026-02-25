import type { Question } from '@/types/question'

interface Props { question: Question }

export default function TextEditor({ question }: Props) {
  return (
    <div className="mt-2">
      <div className={`rounded border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400 ${question.type === 'text-long' ? 'h-16' : 'h-8'}`}>
        {question.type === 'text-short' ? 'Short answer...' : 'Long answer...'}
      </div>
    </div>
  )
}
