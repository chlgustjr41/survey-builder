import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Response } from '@/types/response'
import type { Survey } from '@/types/survey'
import { matchScoreRange, getMaxPossibleScore } from '@/lib/scoring'

interface Props {
  response: Response
  survey: Survey
}

export default function ResponseDetail({ response, survey }: Props) {
  const { t } = useTranslation()
  const maxScore = getMaxPossibleScore(survey.questions)
  const range = matchScoreRange(response.totalScore, survey.resultConfig.ranges)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
      {/* Score header */}
      <div className="text-center border-b border-gray-100 pb-4">
        <p className="text-4xl font-black text-orange-500">{response.totalScore}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('result.outOf')} {maxScore}</p>
        {range && <p className="text-sm text-gray-600 mt-2 font-medium">{range.message}</p>}
      </div>

      {/* Identification */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Responder</p>
        <div className="flex flex-col gap-1">
          {Object.entries(response.identification).map(([key, val]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-500 capitalize">{key}</span>
              <span className="font-medium text-gray-800">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Answers */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Answers</p>
        <div className="flex flex-col gap-3">
          {Object.values(survey.questions).map((question) => {
            const answer = response.answers[question.id]
            if (!answer) return null
            return (
              <div key={question.id} className="text-sm">
                <p className="font-medium text-gray-800 mb-1">{question.prompt}</p>
                <div className="flex items-start justify-between gap-2">
                  <AnswerDisplay answer={answer} question={question} />
                  {answer.score > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">+{answer.score}pts</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-right">{new Date(response.respondedAt).toLocaleString()}</p>
    </div>
  )
}

function AnswerDisplay({ answer, question }: { answer: import('@/types/response').Answer; question: import('@/types/question').Question }) {
  if (Array.isArray(answer.value)) {
    if (question.type === 'checkbox') {
      const labels = (answer.value as string[]).map((id) => question.options?.find((o) => o.id === id)?.label ?? id)
      return <span className="text-gray-600">{labels.join(', ')}</span>
    }
    return <span className="text-gray-600">{(answer.value as string[]).join(', ')}</span>
  }
  if (question.type === 'radio') {
    const label = question.options?.find((o) => o.id === answer.value)?.label ?? String(answer.value)
    return <span className="text-gray-600">{label}</span>
  }
  return <span className="text-gray-600">{String(answer.value)}</span>
}
