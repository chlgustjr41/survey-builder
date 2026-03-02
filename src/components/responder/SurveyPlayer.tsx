import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ResultConfig, Survey } from '@/types/survey'
import type { Answer } from '@/types/response'
import { resolveBranchTarget, calculateAnswerScore, matchAllScoreRanges } from '@/lib/scoring'
import { indexLabel } from '@/lib/utils'
import { readSession, writeSession } from '@/lib/sessionCache'
import QuestionRenderer from './QuestionRenderer'

interface Props {
  survey: Survey
  onSubmit: (answers: Record<string, Answer>, sectionScores: Record<string, number>) => void
  submitting: boolean
}

interface PendingResult {
  config: ResultConfig
  sectionScore: number
  /** The index to advance to once the user dismisses the result screen */
  nextIdx: number
}

export default function SurveyPlayer({ survey, onSubmit, submitting }: Props) {
  const { t } = useTranslation()

  const [sectionIndex, setSectionIndex] = useState(() => {
    const s = readSession(survey.id)
    const visLen = survey.sectionOrder.filter((id) => !survey.sections[id]?.hidden).length
    return s ? Math.min(s.sectionIndex, Math.max(0, visLen - 1)) : 0
  })
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const s = readSession(survey.id)
    if (!s?.answers) return {}
    // Drop answers for questions removed from the survey since the session was saved
    return Object.fromEntries(
      Object.entries(s.answers).filter(([qId]) => qId in survey.questions)
    )
  })
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [runningScore, setRunningScore]   = useState(
    () => readSession(survey.id)?.runningScore ?? 0
  )
  const [sectionScores, setSectionScores] = useState<Record<string, number>>(
    () => readSession(survey.id)?.sectionScores ?? {}
  )
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null)

  // Persist player state to localStorage after every relevant change
  useEffect(() => {
    writeSession(survey.id, { sectionIndex, answers, runningScore, sectionScores })
  }, [survey.id, sectionIndex, answers, runningScore, sectionScores])

  // Notify the responder if we restored a non-trivial session
  useEffect(() => {
    const s = readSession(survey.id)
    if (s && (s.sectionIndex > 0 || Object.keys(s.answers ?? {}).length > 0)) {
      toast.info(t('responder.sessionRestored'), { description: t('responder.sessionRestoredHint') })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exclude hidden sections — they are builder-side drafts and must not appear to respondents
  const visibleSectionOrder = survey.sectionOrder.filter((id) => !survey.sections[id]?.hidden)

  const section       = survey.sections[visibleSectionOrder[sectionIndex]]
  const totalSections = visibleSectionOrder.length
  const progress      = ((sectionIndex + 1) / totalSections) * 100

  const handleAnswer = (questionId: string, value: Answer['value']) => {
    const question = survey.questions[questionId]
    if (!question) return
    const score = calculateAnswerScore({ questionId, value, score: 0 }, question)
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, value, score } }))
    setErrors((prev) => {
      if (!prev[questionId]) return prev
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  const validateSection = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const qId of section.questionOrder) {
      const q   = survey.questions[qId]
      if (!q || q.hidden || !q.required) continue
      const ans = answers[qId]

      if (!ans || ans.value === '' || ans.value === null || ans.value === undefined
          || (Array.isArray(ans.value) && ans.value.length === 0)) {
        newErrors[qId] = t('responder.required')
        continue
      }

      if (q.type === 'choice'
          && q.choiceConfig?.selectionMode === 'range'
          && Array.isArray(ans.value)) {
        const min = q.choiceConfig.min ?? 1
        const max = q.choiceConfig.max ?? (q.options?.length ?? 1)
        if (ans.value.length < min) {
          newErrors[qId] = t('responder.selectMin', { min })
        } else if (ans.value.length > max) {
          newErrors[qId] = t('responder.selectMax', { max })
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstErrId = Object.keys(newErrors)[0]
      document.getElementById(`question-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateSection()) return

    const sectionScore = Object.values(answers)
      .filter((a) => section.questionOrder.includes(a.questionId))
      .reduce((s, a) => s + a.score, 0)
    const newScore = runningScore + sectionScore
    setRunningScore(newScore)

    // Record score for this section (used when combineResultScreens is on)
    const updatedSectionScores = { ...sectionScores, [section.id]: sectionScore }
    setSectionScores(updatedSectionScores)

    const branchTarget = resolveBranchTarget(section.id, survey, answers, newScore)
    // Map the branch target section ID into the visible-sections index.
    // If the target is hidden (not in visibleSectionOrder), fall back to the next visible section.
    const nextIdx = branchTarget
      ? (visibleSectionOrder.indexOf(branchTarget) !== -1
          ? visibleSectionOrder.indexOf(branchTarget)
          : sectionIndex + 1)
      : sectionIndex + 1

    // If this section has a result config with active items, it's not hidden, and we're not
    // combining all screens into one final result, pause and show the per-section result screen
    const rc = section.resultConfig
    const rcActiveItems = rc
      ? (survey.scoringDisabled ? (rc.messages ?? []) : rc.ranges)
      : []
    if (rc && rcActiveItems.length > 0 && !(rc.hideResults ?? false) && !(survey.combineResultScreens ?? false)) {
      setPendingResult({ config: rc, sectionScore, nextIdx })
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    advanceTo(nextIdx, answers, updatedSectionScores)
  }

  const advanceTo = (nextIdx: number, currentAnswers: Record<string, Answer>, currentSectionScores: Record<string, number>) => {
    if (nextIdx >= totalSections || nextIdx < 0) {
      onSubmit(currentAnswers, currentSectionScores)
    } else {
      setErrors({})
      setSectionIndex(nextIdx)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  /** Called when the user dismisses the per-section result screen */
  const handleResultContinue = () => {
    if (!pendingResult) return
    const { nextIdx } = pendingResult
    setPendingResult(null)
    advanceTo(nextIdx, answers, sectionScores)
  }

  const handleBack = () => {
    if (sectionIndex > 0) {
      setErrors({})
      setSectionIndex((i) => i - 1)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const isLast = sectionIndex === totalSections - 1

  // ── Per-section result screen ──────────────────────────────────────────────
  if (pendingResult) {
    return (
      <SectionResultScreen
        config={pendingResult.config}
        sectionScore={pendingResult.sectionScore}
        onContinue={handleResultContinue}
        isLastSection={pendingResult.nextIdx >= totalSections || pendingResult.nextIdx === -1}
        scoringDisabled={survey.scoringDisabled ?? false}
      />
    )
  }

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
              <h2 className="text-xl font-bold text-gray-900">
                {(() => {
                  const fmt = survey.formatConfig?.sectionIndex ?? 'none'
                  // Use the visible-section index for correct numbering
                  const visIdx = visibleSectionOrder.indexOf(section.id)
                  const prefix = indexLabel(visIdx, fmt)
                  return prefix ? <><span className="text-orange-500 mr-1.5">{prefix}</span>{section.title}</> : section.title
                })()}
              </h2>
            )}
            {section.description && (
              <p className="text-sm text-gray-500 -mt-3 leading-relaxed">{section.description}</p>
            )}

            {section.questionOrder.map(
              // IIFE so we can maintain a counter for questions only;
              // text blocks must not increment the question index.
              // Hidden questions and text blocks are skipped entirely.
              (() => {
                let qCount = 0
                return (qId: string) => {
                  const question = survey.questions[qId]
                  if (question) {
                    if (question.hidden) return null   // skip hidden questions
                    return (
                      <QuestionRenderer
                        key={qId}
                        id={`question-${qId}`}
                        question={question}
                        value={answers[qId]?.value}
                        onChange={(val) => handleAnswer(qId, val)}
                        error={errors[qId]}
                        questionIndex={qCount++}
                        questionIndexFormat={survey.formatConfig?.questionIndex ?? 'none'}
                        optionIndexFormat={survey.formatConfig?.optionIndex ?? 'none'}
                      />
                    )
                  }
                  const tb = survey.textBlocks?.[qId]
                  if (tb?.content) {
                    return (
                      <p key={qId} className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {tb.content}
                      </p>
                    )
                  }
                  return null
                }
              })()
            )}
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
            {submitting
              ? t('responder.submitting')
              : isLast
              ? t('responder.submit')
              : t('responder.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Per-section result screen component ───────────────────────────────────────
interface SectionResultProps {
  config: ResultConfig
  sectionScore: number
  onContinue: () => void
  isLastSection: boolean
  scoringDisabled: boolean
}

function SectionResultScreen({ config, sectionScore, onContinue, isLastSection, scoringDisabled }: SectionResultProps) {
  const { t } = useTranslation()
  // When scoring is disabled, use unconditional messages; otherwise filter ranges by score
  const matchedRanges = scoringDisabled
    ? (config.messages ?? [])
    : matchAllScoreRanges(sectionScore, config.ranges)
  const showScoreNumber = !scoringDisabled && config.showScore

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="bg-white rounded-2xl shadow-md border border-gray-100 max-w-sm w-full overflow-hidden"
      >
        <div className="bg-orange-500 px-6 py-7 text-center">
          <CheckCircle2 className="w-9 h-9 text-white mx-auto mb-2 opacity-90" />
          <h2 className="text-white text-lg font-bold">{t('result.sectionComplete')}</h2>
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">
          {showScoreNumber && (
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('result.sectionScore')}</p>
              <p className="text-5xl font-black text-orange-500">{sectionScore}</p>
            </div>
          )}

          {matchedRanges.length > 0 ? (
            <div className="flex flex-col gap-4">
              {matchedRanges.map((range, i) => (
                <div key={range.id} className="flex flex-col gap-2">
                  {i > 0 && <div className="border-t border-gray-100" />}
                  {range.imageUrl && (
                    <img
                      src={range.imageUrl}
                      alt="Result"
                      className="w-full rounded-xl object-cover max-h-48"
                    />
                  )}
                  {range.message && (
                    <p className="text-gray-700 text-sm text-center leading-relaxed">{range.message}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            (scoringDisabled ? (config.messages ?? []) : config.ranges).length > 0 && (
              <p className="text-gray-500 text-sm text-center leading-relaxed">{t('result.noRange')}</p>
            )
          )}

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onContinue}
          >
            {isLastSection ? t('responder.submit') : t('responder.continue')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
