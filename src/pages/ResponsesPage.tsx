import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getSurveyById } from '@/services/surveyService'
import { subscribeToResponses } from '@/services/responseService'
import { getErrorMessage } from '@/lib/errorMessage'
import type { Survey } from '@/types/survey'
import type { Response, ResponseFilters } from '@/types/response'
import AppShell from '@/components/shared/AppShell'
import ResponseList from '@/components/responses/ResponseList'
import ResponseDetail from '@/components/responses/ResponseDetail'

export default function ResponsesPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [selected, setSelected] = useState<Response | null>(null)
  const [filters, setFilters] = useState<ResponseFilters>({})

  useEffect(() => {
    if (!id) return
    getSurveyById(id)
      .then(setSurvey)
      .catch((err) => {
        toast.error(getErrorMessage(err, 'Failed to load survey details. Scores may not display correctly.'))
      })
    const unsub = subscribeToResponses(id, setResponses)
    return unsub
  }, [id])

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
          <span className="ml-auto text-sm text-gray-400">
            {t('responses.total', { count: responses.length })}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ResponseList
              responses={responses}
              survey={survey}
              filters={filters}
              onFiltersChange={setFilters}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          </div>
          <div>
            {selected && survey ? (
              <ResponseDetail response={selected} survey={survey} />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                Select a response to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
