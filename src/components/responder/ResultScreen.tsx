import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import type { Survey } from '@/types/survey'
import { matchScoreRange, getMaxPossibleScore } from '@/lib/scoring'

interface Props {
  survey: Survey
  totalScore: number
}

export default function ResultScreen({ survey, totalScore }: Props) {
  const { t } = useTranslation()
  const { resultConfig } = survey
  const maxScore = getMaxPossibleScore(survey.questions)
  const range = matchScoreRange(totalScore, resultConfig.ranges)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-md border border-gray-100 max-w-sm w-full overflow-hidden"
      >
        <div className="bg-orange-500 px-6 py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-3 opacity-90" />
          <h2 className="text-white text-xl font-bold">{t('responder.thankYou')}</h2>
          <p className="text-orange-100 text-sm mt-1">{t('responder.responseSubmitted')}</p>
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">
          {resultConfig.showScore && (
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('result.yourScore')}</p>
              <p className="text-5xl font-black text-orange-500">{totalScore}</p>
              {maxScore > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">{t('result.outOf')} {maxScore}</p>
              )}
            </div>
          )}

          {range && (
            <>
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
