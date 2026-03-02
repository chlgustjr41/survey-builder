import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { subscribeToSurvey } from '@/services/surveyService'
import { submitResponse, checkDuplicateIdentification } from '@/services/responseService'
import { getErrorMessage } from '@/lib/errorMessage'
import { calculateTotalScore, isSurveyOpen } from '@/lib/scoring'
import { normalizeSurvey } from '@/lib/normalize'
import { readSession, writeSession, clearSession } from '@/lib/sessionCache'
import type { Survey } from '@/types/survey'
import type { Answer, ResponseInput } from '@/types/response'
import IdentificationForm from '@/components/responder/IdentificationForm'
import SurveyPlayer from '@/components/responder/SurveyPlayer'
import SurveyGate from '@/components/responder/SurveyGate'

type Stage = 'loading' | 'gated' | 'identification' | 'checking' | 'duplicate' | 'survey' | 'submitting'

export default function SurveyResponderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [identification, setIdentification] = useState<Record<string, string>>({})
  const [gateReason, setGateReason] = useState<'locked' | 'not-started' | 'ended'>('locked')

  // Restore the user's preferred language when leaving the responder page
  const prevLang = useRef(i18n.language)

  useEffect(() => {
    return () => {
      const savedLang = localStorage.getItem('lang') ?? 'en'
      if (i18n.language !== savedLang) i18n.changeLanguage(savedLang)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!id) return
    const unsub = subscribeToSurvey(id, (raw) => {
      if (!raw) { navigate('/'); return }
      const s = normalizeSurvey(raw)
      setSurvey(s)

      // Apply the survey's default language for the responder experience
      if (s.defaultLanguage && s.defaultLanguage !== i18n.language) {
        prevLang.current = i18n.language
        i18n.changeLanguage(s.defaultLanguage)
      }

      const { open, reason } = isSurveyOpen(s.status, s.schedule)
      if (!open) {
        setGateReason(reason!)
        setStage('gated')
      } else if (stage === 'loading' || stage === 'gated') {
        if (s.identificationFields.length > 0) {
          const session = readSession(s.id)
          const cached = session?.identification
          const allPresent = !!cached && s.identificationFields.every(f => f.fieldKey in cached)
          if (allPresent) {
            setIdentification(cached)
            setStage('survey')
          } else {
            setStage('identification')
          }
        } else {
          setStage('survey')
        }
      }
    })
    return unsub
  }, [id, navigate])

  const handleIdentified = async (fields: Record<string, string>) => {
    setIdentification(fields)
    if (survey) writeSession(survey.id, { identification: fields })

    // Block duplicate submissions when configured
    if (survey && survey.allowDuplicates === false && survey.identificationFields.length > 0) {
      setStage('checking')
      try {
        const isDuplicate = await checkDuplicateIdentification(survey.id, fields)
        if (isDuplicate) {
          setStage('duplicate')
          return
        }
      } catch {
        // If the check fails, allow the respondent to proceed rather than blocking
      }
    }

    setStage('survey')
  }

  const handleSubmit = async (answers: Record<string, Answer>, sectionScores: Record<string, number>) => {
    if (!survey) return
    setStage('submitting')
    try {
      // When scoring is disabled, store 0 so no meaningless number appears in the dashboard
      const totalScore = survey.scoringDisabled ? 0 : calculateTotalScore(answers, survey.questions)
      const input: ResponseInput = {
        surveyId: survey.id,
        respondedAt: Date.now(),
        identification,
        answers,
        totalScore,
        emailSent: false,
      }
      await submitResponse(input)
      clearSession(survey.id)
      navigate(`/s/${survey.id}/result`, { state: { totalScore, surveyId: survey.id, sectionScores } })
    } catch (err) {
      console.error('Failed to submit response:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to submit your response — your answers were not saved')
      toast.error(message, { description: detail })
      setStage('survey')
    }
  }

  if (stage === 'loading' || stage === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (stage === 'gated') {
    return <SurveyGate reason={gateReason} survey={survey} />
  }

  if (stage === 'duplicate') {
    return <SurveyGate reason="duplicate" survey={survey} />
  }

  if (stage === 'identification' && survey) {
    return (
      <IdentificationForm
        fields={survey.identificationFields}
        onSubmit={handleIdentified}
        title={survey.title}
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
