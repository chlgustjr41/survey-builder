import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import type { ResultConfig, Survey } from '@/types/survey'
import { matchAllScoreRanges, getMaxPossibleScore } from '@/lib/scoring'

interface Props {
  survey: Survey
  totalScore: number
  sectionScores?: Record<string, number>
}

export default function ResultScreen({ survey, totalScore, sectionScores = {} }: Props) {
  const { t } = useTranslation()
  const { resultConfig, scoringDisabled, combineResultScreens, sectionOrder, sections } = survey

  // Whether to suppress the entire result body (score + ranges) from respondents
  const hideResults = resultConfig.hideResults ?? false
  // Score number: visible only when result screen is shown, scoring is on, and showScore enabled
  const showScoreNumber = !hideResults && !scoringDisabled && resultConfig.showScore

  const maxScore = getMaxPossibleScore(survey.questions)
  // When scoring is disabled, use unconditional messages; otherwise filter ranges by score
  const matchedRanges = hideResults
    ? []
    : scoringDisabled
    ? (resultConfig.messages ?? [])
    : matchAllScoreRanges(totalScore, resultConfig.ranges)

  // Build the list of section result blocks for combined mode
  const combinedSections = (combineResultScreens && sectionOrder)
    ? sectionOrder.reduce<Array<{
        sId: string
        title: string
        rc: ResultConfig
        sScore: number
        sRanges: ResultConfig['ranges']
        hasActiveItems: boolean
        showScore: boolean
      }>>((acc, sId) => {
        const section = sections[sId]
        const rc = section?.resultConfig
        if (!rc || (rc.hideResults ?? false)) return acc
        // Use messages array when scoring is disabled, ranges otherwise
        const activeItems = scoringDisabled ? (rc.messages ?? []) : rc.ranges
        if (activeItems.length === 0) return acc
        const sScore = sectionScores[sId] ?? 0
        const sRanges = scoringDisabled ? activeItems : matchAllScoreRanges(sScore, activeItems)
        acc.push({
          sId,
          title: section.title || '',
          rc,
          sScore,
          sRanges,
          hasActiveItems: activeItems.length > 0,
          showScore: !scoringDisabled && (rc.showScore ?? false),
        })
        return acc
      }, [])
    : []

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col gap-4 max-w-sm w-full">

        {/* ── General result card ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
        >
          <div className="bg-orange-500 px-6 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-3 opacity-90" />
            <h2 className="text-white text-xl font-bold">{t('responder.thankYou')}</h2>
            <p className="text-orange-100 text-sm mt-1">{t('responder.responseSubmitted')}</p>
          </div>

          {/* Body — omitted entirely when hideResults is true */}
          {!hideResults && (
            <div className="px-6 py-6 flex flex-col gap-5">
              {showScoreNumber && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('result.yourScore')}</p>
                  <p className="text-5xl font-black text-orange-500">{totalScore}</p>
                  {maxScore > 0 && (
                    <p className="text-sm text-gray-400 mt-0.5">{t('result.outOf')} {maxScore}</p>
                  )}
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
                (scoringDisabled ? (resultConfig.messages ?? []) : resultConfig.ranges).length > 0 && (
                  <p className="text-gray-500 text-sm text-center leading-relaxed">{t('result.noRange')}</p>
                )
              )}
            </div>
          )}
        </motion.div>

        {/* ── Combined section result cards ──────────────────────────────── */}
        {combinedSections.map(({ sId, title, sScore, sRanges, hasActiveItems, showScore }, i) => (
          <motion.div
            key={sId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.07 }}
            className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
          >
            {title && (
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
                <p className="text-xs font-semibold text-gray-600 truncate">{title}</p>
              </div>
            )}
            <div className="px-4 py-4 flex flex-col gap-3">
              {showScore && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('result.sectionScore')}</p>
                  <p className="text-3xl font-black text-orange-500">{sScore}</p>
                </div>
              )}

              {sRanges.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {sRanges.map((range, j) => (
                    <div key={range.id} className="flex flex-col gap-2">
                      {j > 0 && <div className="border-t border-gray-100" />}
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
                hasActiveItems && (
                  <p className="text-gray-500 text-sm text-center leading-relaxed">{t('result.noRange')}</p>
                )
              )}
            </div>
          </motion.div>
        ))}

      </div>
    </div>
  )
}
