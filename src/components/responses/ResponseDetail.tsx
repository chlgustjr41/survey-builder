import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { indexLabel } from '@/lib/utils'
import type { Answer, Response } from '@/types/response'
import type { Question, QuestionOption } from '@/types/question'
import type { Survey, IndexFormat } from '@/types/survey'
import { matchAllScoreRanges, getMaxPossibleScore } from '@/lib/scoring'

interface Props {
  response: Response
  survey: Survey
  showScore?: boolean
  onBack?: () => void
}

export default function ResponseDetail({ response, survey, showScore = true, onBack }: Props) {
  const { t } = useTranslation()
  const maxScore = getMaxPossibleScore(survey.questions)
  const matchedRanges = matchAllScoreRanges(response.totalScore, survey.resultConfig?.ranges ?? [])
  const unconditionalMessages = survey.resultConfig?.messages ?? []
  const scorePercent = maxScore > 0 ? Math.round((response.totalScore / maxScore) * 100) : 0
  const hasIdentification = Object.keys(response.identification ?? {}).length > 0

  const sectionFmt:  IndexFormat = survey.formatConfig?.sectionIndex  ?? 'none'
  const questionFmt: IndexFormat = survey.formatConfig?.questionIndex ?? 'none'
  const optionFmt:   IndexFormat = survey.formatConfig?.optionIndex   ?? 'none'

  // Compute per-section scores from stored answer scores (not saved in Response)
  const sectionScores: Record<string, number> = {}
  for (const [sid, section] of Object.entries(survey.sections)) {
    sectionScores[sid] = (section.questionOrder ?? []).reduce(
      (acc, qid) => acc + (response.answers[qid]?.score ?? 0),
      0,
    )
  }

  // Build section result cards — mirrors ResultScreen.tsx's combined-section logic
  const sectionResultCards = survey.sectionOrder.reduce<Array<{
    sId: string
    title: string
    sScore: number
    sRanges: ReturnType<typeof matchAllScoreRanges>
    showScore: boolean
    hasActiveItems: boolean
  }>>((acc, sId) => {
    const section = survey.sections[sId]
    const rc = section?.resultConfig
    if (!rc || (rc.hideResults ?? false)) return acc
    const activeItems = survey.scoringDisabled ? (rc.messages ?? []) : rc.ranges
    if (activeItems.length === 0) return acc
    const sScore = sectionScores[sId] ?? 0
    const sRanges = survey.scoringDisabled ? activeItems : matchAllScoreRanges(sScore, activeItems)
    acc.push({
      sId,
      title: section.title || '',
      sScore,
      sRanges,
      showScore: !survey.scoringDisabled && (rc.showScore ?? false),
      hasActiveItems: activeItems.length > 0,
    })
    return acc
  }, [])

  // Build section list — only sections with at least one answered question
  const sectionedQuestions = survey.sectionOrder
    .map((sid) => {
      const section = survey.sections[sid]
      if (!section) return null
      const questions = (section.questionOrder ?? [])
        .map((qid) => survey.questions[qid])
        .filter(Boolean)
      if (!questions.some((q) => response.answers[q.id])) return null
      const sectionIdx = survey.sectionOrder.indexOf(sid)
      return { sectionId: sid, title: section.title, sectionIdx, questions }
    })
    .filter(Boolean) as {
      sectionId: string
      title: string
      sectionIdx: number
      questions: Question[]
    }[]

  const showSectionTitles = sectionedQuestions.length > 1 || Boolean(sectionedQuestions[0]?.title?.trim())

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">

      {/* ── Mobile back button ─────────────────────────────────────────────── */}
      {onBack && (
        <button
          onClick={onBack}
          className="lg:hidden flex items-center gap-1 px-4 py-3 text-sm text-gray-500 hover:text-gray-900 border-b border-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('responses.backToList')}
        </button>
      )}

      {/* ── Result summary ──────────────────────────────────────────────────── */}
      {!survey.scoringDisabled ? (
        <div className="bg-linear-to-br from-orange-50 to-amber-50 border-b border-orange-100 px-5 py-5 flex flex-col items-center gap-3">
          {/* Score number + progress bar — hidden when showScore is off */}
          {showScore && (
            <>
              <p className="text-5xl font-black text-orange-500 leading-none tabular-nums">
                {response.totalScore}
              </p>
              <p className="text-xs text-gray-400">
                {t('result.outOf')} {maxScore} {t('responses.detail.pts')}
              </p>

              {/* Progress bar */}
              {maxScore > 0 && (
                <div className="w-full max-w-52">
                  <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-1">{scorePercent}%</p>
                </div>
              )}
            </>
          )}

          {/* Global matched score ranges */}
          {matchedRanges.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-1">
              {matchedRanges.map((range) => (
                <div key={range.id} className="bg-white border border-orange-100 rounded-xl p-3 flex flex-col gap-1.5">
                  {range.imageUrl && (
                    <img src={range.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-36" />
                  )}
                  <p className="text-sm font-medium text-orange-700 text-center">{range.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-section result cards */}
          {sectionResultCards.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-1">
              {sectionResultCards.map(({ sId, title, sScore, sRanges, showScore: showSectionScore, hasActiveItems }) => (
                <div key={sId} className="bg-white border border-orange-100 rounded-xl overflow-hidden">
                  {title && (
                    <div className="bg-orange-50 border-b border-orange-100 px-3 py-1.5">
                      <p className="text-xs font-semibold text-orange-700 truncate">{title}</p>
                    </div>
                  )}
                  <div className="px-3 py-3 flex flex-col gap-2">
                    {showScore && showSectionScore && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">
                          {t('result.sectionScore')}
                        </p>
                        <p className="text-2xl font-black text-orange-500">{sScore}</p>
                      </div>
                    )}
                    {sRanges.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {sRanges.map((range, j) => (
                          <div key={range.id} className="flex flex-col gap-1.5">
                            {j > 0 && <div className="border-t border-gray-100" />}
                            {range.imageUrl && (
                              <img src={range.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-36" />
                            )}
                            {range.message && (
                              <p className="text-sm text-orange-700 text-center leading-relaxed">{range.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      hasActiveItems && (
                        <p className="text-xs text-gray-400 text-center">{t('result.noRange')}</p>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400">{new Date(response.respondedAt).toLocaleString()}</p>
        </div>
      ) : (
        <div className="border-b border-gray-100 px-5 py-4 flex flex-col gap-2">
          {/* Global unconditional messages (scoring-disabled surveys) */}
          {unconditionalMessages.length > 0 && (
            <div className="flex flex-col gap-2 mb-1">
              {unconditionalMessages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-1.5">
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-36" />
                  )}
                  <p className="text-sm text-gray-700 text-center">{msg.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-section result cards (scoring-disabled) */}
          {sectionResultCards.length > 0 && (
            <div className="flex flex-col gap-2 mb-1">
              {sectionResultCards.map(({ sId, title, sRanges }) => (
                <div key={sId} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  {title && (
                    <div className="border-b border-gray-100 px-3 py-1.5">
                      <p className="text-xs font-semibold text-gray-600 truncate">{title}</p>
                    </div>
                  )}
                  <div className="px-3 py-3 flex flex-col gap-2">
                    {sRanges.map((range, j) => (
                      <div key={range.id} className="flex flex-col gap-1.5">
                        {j > 0 && <div className="border-t border-gray-100" />}
                        {range.imageUrl && (
                          <img src={range.imageUrl} alt="" className="w-full rounded-lg object-cover max-h-36" />
                        )}
                        {range.message && (
                          <p className="text-sm text-gray-700 text-center leading-relaxed">{range.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">{new Date(response.respondedAt).toLocaleString()}</p>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto max-h-[calc(100vh-20rem)]">

        {/* Identification */}
        {hasIdentification && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              {t('responses.detail.responder')}
            </p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(response.identification).map(([key, val]) => (
                <div key={key} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-500 capitalize shrink-0">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-gray-800 text-right break-all">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answers */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t('responses.detail.answers')}
          </p>

          {sectionedQuestions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('responses.detail.noAnswers')}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {sectionedQuestions.map(({ sectionId, title, sectionIdx, questions }) => {
                // Question counter resets per section — same as the survey player
                let qLocalIdx = 0
                const sectionPrefix = indexLabel(sectionIdx, sectionFmt)

                return (
                  <div key={sectionId} className="flex flex-col gap-3">
                    {/* Section title with optional prefix */}
                    {showSectionTitles && title.trim() && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">
                        {sectionPrefix && (
                          <span className="text-orange-400 mr-1">{sectionPrefix}</span>
                        )}
                        {title}
                      </p>
                    )}

                    {questions.map((question) => {
                      const answer = response.answers[question.id]
                      if (!answer) return null
                      const score = answer.score ?? 0
                      const qIdx = qLocalIdx++
                      const qPrefix = indexLabel(qIdx, questionFmt)

                      return (
                        <div key={question.id} className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-gray-800 leading-snug">
                              {qPrefix && (
                                <span className="text-orange-400 font-bold mr-1.5">{qPrefix}</span>
                              )}
                              {question.prompt || (
                                <span className="italic text-gray-400">{t('builder.branchRules.untitledQuestion')}</span>
                              )}
                            </p>
                            {showScore && !survey.scoringDisabled && score > 0 && (
                              <Badge variant="secondary" className="text-xs shrink-0 bg-orange-50 text-orange-600 border border-orange-100">
                                +{score} pts
                              </Badge>
                            )}
                          </div>
                          <AnswerDisplay answer={answer} question={question} optionFmt={optionFmt} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AnswerDisplayProps {
  answer: Answer
  question: Question
  optionFmt: IndexFormat
}

function AnswerDisplay({ answer, question, optionFmt }: AnswerDisplayProps) {
  const { t } = useTranslation()

  // ── Choice: vertical rows with configurable option prefix ─────────────────
  if (question.type === 'choice') {
    const options: QuestionOption[] = question.options ?? []
    const selectedIds = Array.isArray(answer.value)
      ? (answer.value as string[])
      : [answer.value as string]

    if (options.length === 0) {
      return <span className="text-sm text-gray-400 italic">{t('responses.detail.noAnswer')}</span>
    }

    return (
      <div className="flex flex-col gap-1">
        {options.map((opt, i) => {
          const selected = selectedIds.includes(opt.id)
          const prefix = indexLabel(i, optionFmt)
          return (
            <div
              key={opt.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                selected
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              {prefix && (
                <span className={`text-xs font-bold min-w-5 h-5 px-0.5 rounded flex items-center justify-center shrink-0 ${
                  selected ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {prefix}
                </span>
              )}
              <span className={selected ? 'font-medium' : ''}>{opt.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Scale: step boxes ──────────────────────────────────────────────────────
  if (question.type === 'scale') {
    const val = typeof answer.value === 'number' ? answer.value : Number(answer.value)
    const { min = 1, max = 5, minLabel, maxLabel } = question.scaleConfig ?? {}
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {steps.map((step) => (
            <div
              key={step}
              className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-semibold border transition-colors ${
                step === val
                  ? 'bg-orange-400 border-orange-400 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        {(minLabel || maxLabel) && (
          <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        )}
      </div>
    )
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  const textVal = Array.isArray(answer.value)
    ? (answer.value as string[]).join(', ')
    : String(answer.value ?? '')

  if (!textVal.trim()) {
    return <span className="text-sm text-gray-400 italic">{t('responses.detail.noAnswer')}</span>
  }

  return (
    <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
      {textVal}
    </p>
  )
}
