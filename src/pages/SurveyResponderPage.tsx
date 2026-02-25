import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { subscribeToSurvey } from '@/services/surveyService'
import { submitResponse } from '@/services/responseService'
import { getErrorMessage } from '@/lib/errorMessage'
import { calculateTotalScore, isSurveyOpen } from '@/lib/scoring'
import { normalizeSurvey } from '@/lib/normalize'
import type { Survey } from '@/types/survey'
import type { Answer, ResponseInput } from '@/types/response'
import IdentificationForm from '@/components/responder/IdentificationForm'
import SurveyPlayer from '@/components/responder/SurveyPlayer'
import SurveyGate from '@/components/responder/SurveyGate'

type Stage = 'loading' | 'gated' | 'identification' | 'survey' | 'submitting'

export default function SurveyResponderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [identification, setIdentification] = useState<Record<string, string>>({})
  const [gateReason, setGateReason] = useState<'locked' | 'not-started' | 'ended'>('locked')

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToSurvey(id, (raw) => {
      if (!raw) { navigate('/'); return }
      const s = normalizeSurvey(raw)
      setSurvey(s)
      const { open, reason } = isSurveyOpen(s.status, s.schedule)
      if (!open) {
        setGateReason(reason!)
        setStage('gated')
      } else if (stage === 'loading' || stage === 'gated') {
        if (s.identificationFields.length > 0) setStage('identification')
        else setStage('survey')
      }
    })
    return unsub
  }, [id, navigate])

  const handleIdentified = (fields: Record<string, string>) => {
    setIdentification(fields)
    setStage('survey')
  }

  const handleSubmit = async (answers: Record<string, Answer>) => {
    if (!survey) return
    setStage('submitting')
    try {
      const totalScore = calculateTotalScore(answers, survey.questions)
      const input: ResponseInput = {
        surveyId: survey.id,
        respondedAt: Date.now(),
        identification,
        answers,
        totalScore,
        emailSent: false,
      }
      await submitResponse(input)
      navigate(`/s/${survey.id}/result`, { state: { totalScore, surveyId: survey.id } })
    } catch (err) {
      console.error('Failed to submit response:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to submit your response — your answers were not saved')
      toast.error(message, { description: detail })
      setStage('survey')
    }
  }

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (stage === 'gated') {
    return <SurveyGate reason={gateReason} survey={survey} />
  }

  if (stage === 'identification' && survey) {
    return (
      <IdentificationForm
        fields={survey.identificationFields}
        onSubmit={handleIdentified}
      />
    )
  }

  if ((stage === 'survey' || stage === 'submitting') && survey) {
    return (
      <SurveyPlayer
        survey={survey}
        onSubmit={handleSubmit}
        submitting={stage === 'submitting'}
      />
    )
  }

  return null
}
