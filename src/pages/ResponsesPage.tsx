import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getSurveyById } from '@/services/surveyService'
import { subscribeToResponses } from '@/services/responseService'
import { getErrorMessage } from '@/lib/errorMessage'
import { normalizeSurvey } from '@/lib/normalize'
import type { Survey } from '@/types/survey'
import type { Response, ResponseFilters } from '@/types/response'
import AppShell from '@/components/shared/AppShell'
import ResponseList from '@/components/responses/ResponseList'
import ResponseDetail from '@/components/responses/ResponseDetail'

const scoreVisKey = (surveyId: string) => `responses-show-score-${surveyId}`

function readScoreVis(surveyId: string): boolean | null {
  try {
    const raw = localStorage.getItem(scoreVisKey(surveyId))
    return raw === null ? null : raw === 'true'
  } catch { return null }
}

function writeScoreVis(surveyId: string, value: boolean): void {
  try { localStorage.setItem(scoreVisKey(surveyId), String(value)) } catch {}
}

export default function ResponsesPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [selected, setSelected] = useState<Response | null>(null)
  const [filters, setFilters] = useState<ResponseFilters>({})

  // Initialise from localStorage if a preference was saved for this survey;
  // fall back to true so the UI is ready before the survey data arrives.
  const [showScore, setShowScore] = useState<boolean>(() => {
    if (!id) return true
    const saved = readScoreVis(id)
    return saved !== null ? saved : true
  })

  useEffect(() => {
    if (!id) return
    getSurveyById(id)
      .then((raw) => raw ? normalizeSurvey(raw) : null)
      .then((s) => {
        setSurvey(s)
        if (!s) return
        // Only apply the scoring-disabled default when the user has no saved preference
        if (readScoreVis(id) === null) {
          const defaultVisible = !s.scoringDisabled
          setShowScore(defaultVisible)
          writeScoreVis(id, defaultVisible)
        }
      })
      .catch((err) => {
        const { message, detail } = getErrorMessage(err, 'Failed to load survey details. Scores may not display correctly.')
        toast.error(message, { description: detail })
      })
    const unsub = subscribeToResponses(id, setResponses)
    return unsub
  }, [id])

  const handleToggleScore = () => {
    setShowScore((prev) => {
      const next = !prev
      if (id) writeScoreVis(id, next)
      return next
    })
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('responses.title')}</h1>
            {survey && <p className="text-sm text-gray-500">{survey.title}</p>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={handleToggleScore}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors py-1 px-2 rounded-md hover:bg-gray-100"
              title={showScore ? t('responses.hideScore') : t('responses.showScore')}
            >
              {showScore
                ? <Eye className="w-3.5 h-3.5" />
                : <EyeOff className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:inline">
                {showScore ? t('responses.hideScore') : t('responses.showScore')}
              </span>
            </button>
            <span className="text-sm text-gray-400">
              {t('responses.total', { count: responses.length })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <ResponseList
              responses={responses}
              survey={survey}
              filters={filters}
              onFiltersChange={setFilters}
              onSelect={setSelected}
              selectedId={selected?.id}
              showScore={showScore}
            />
          </div>
          <div className="lg:col-span-3">
            {selected && survey ? (
              <ResponseDetail response={selected} survey={survey} showScore={showScore} />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                {t('responses.selectToView')}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
