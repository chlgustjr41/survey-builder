import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { Survey } from '@/types/survey'
import type { Answer } from '@/types/response'
import { resolveBranchTarget, calculateAnswerScore } from '@/lib/scoring'
import QuestionRenderer from './QuestionRenderer'

interface Props {
  survey: Survey
  onSubmit: (answers: Record<string, Answer>) => void
  submitting: boolean
}

export default function SurveyPlayer({ survey, onSubmit, submitting }: Props) {
  const { t } = useTranslation()
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [runningScore, setRunningScore] = useState(0)

  const section = survey.sections[survey.sectionOrder[sectionIndex]]
  const totalSections = survey.sectionOrder.length
  const progress = ((sectionIndex + 1) / totalSections) * 100

  const handleAnswer = (questionId: string, value: Answer['value']) => {
    const question = survey.questions[questionId]
    if (!question) return
    const score = calculateAnswerScore({ questionId, value, score: 0 }, question)
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, value, score } }))
  }

  const validateSection = () => {
    for (const qId of section.questionOrder) {
      const q = survey.questions[qId]
      if (!q?.required) continue
      const ans = answers[qId]
      if (!ans || ans.value === '' || (Array.isArray(ans.value) && ans.value.length === 0)) {
        toast.error(t('responder.required'))
        return false
      }
      if (q.type === 'checkbox' && q.checkboxConfig && Array.isArray(ans.value)) {
        const { min, max } = q.checkboxConfig
        if (ans.value.length < min) { toast.error(t('responder.selectMin', { min })); return false }
        if (ans.value.length > max) { toast.error(t('responder.selectMax', { max })); return false }
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateSection()) return

    const newScore = runningScore + Object.values(answers)
      .filter((a) => section.questionOrder.includes(a.questionId))
      .reduce((s, a) => s + a.score, 0)
    setRunningScore(newScore)

    const branchTarget = resolveBranchTarget(section.id, survey, answers, newScore)
    const nextIdx = branchTarget
      ? survey.sectionOrder.indexOf(branchTarget)
      : sectionIndex + 1

    if (nextIdx >= totalSections || nextIdx === -1) {
      onSubmit(answers)
    } else {
      setSectionIndex(nextIdx)
    }
  }

  const handleBack = () => {
    if (sectionIndex > 0) setSectionIndex((i) => i - 1)
  }

  const isLast = sectionIndex === totalSections - 1

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">{sectionIndex + 1} / {totalSections}</span>
          <Progress value={progress} className="flex-1 h-1.5" />
        </div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {section.title && (
              <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            )}

            {section.questionOrder.map((qId) => {
              const question = survey.questions[qId]
              if (!question) return null
              return (
                <QuestionRenderer
                  key={qId}
                  question={question}
                  value={answers[qId]?.value}
                  onChange={(val) => handleAnswer(qId, val)}
                />
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex gap-3">
          {sectionIndex > 0 && (
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              {t('responder.back')}
            </Button>
          )}
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? t('responder.submitting') : isLast ? t('responder.submit') : t('responder.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
