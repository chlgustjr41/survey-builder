import { useTranslation } from 'react-i18next'
import { Lock, Clock, CalendarOff, UserX } from 'lucide-react'
import type { Survey } from '@/types/survey'

interface Props {
  reason: 'locked' | 'not-started' | 'ended' | 'duplicate'
  survey: Survey | null
}

const CONFIG = {
  locked: { icon: Lock, color: 'text-orange-500', bg: 'bg-orange-50', key: 'responder.surveyLocked', hintKey: '' },
  'not-started': { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', key: 'responder.surveyNotStarted', hintKey: '' },
  ended: { icon: CalendarOff, color: 'text-gray-500', bg: 'bg-gray-50', key: 'responder.surveyEnded', hintKey: '' },
  duplicate: { icon: UserX, color: 'text-red-500', bg: 'bg-red-50', key: 'responder.duplicateBlocked', hintKey: 'responder.duplicateBlockedHint' },
}

export default function SurveyGate({ reason, survey }: Props) {
  const { t } = useTranslation()
  const { icon: Icon, color, bg, key, hintKey } = CONFIG[reason]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className={`${bg} rounded-2xl p-8 max-w-sm w-full text-center shadow-sm`}>
        <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {survey && <h2 className="font-semibold text-gray-800 mb-2">{survey.title}</h2>}
        <p className="text-sm text-gray-500">{t(key)}</p>
        {hintKey && <p className="text-xs text-gray-400 mt-1">{t(hintKey)}</p>}
      </div>
    </div>
  )
}
