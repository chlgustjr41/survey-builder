import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getSurveyById } from '@/services/surveyService'
import { normalizeSurvey } from '@/lib/normalize'
import type { Survey } from '@/types/survey'
import ResultScreen from '@/components/responder/ResultScreen'

export default function SurveyResultPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const totalScore = (location.state as { totalScore?: number })?.totalScore ?? 0

  useEffect(() => {
    if (!id) { navigate('/'); return }
    getSurveyById(id).then((s) => {
      if (!s) navigate('/')
      else setSurvey(normalizeSurvey(s))
      setLoading(false)
    })
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (!survey) return null

  return <ResultScreen survey={survey} totalScore={totalScore} />
}
