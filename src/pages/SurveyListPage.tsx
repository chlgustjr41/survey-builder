import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useSurveyStore } from '@/stores/surveyStore'
import { subscribeToAuthorSurveys } from '@/services/surveyService'
import AppShell from '@/components/shared/AppShell'
import SurveyCard from '@/components/shared/SurveyCard'

export default function SurveyListPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { surveys, setSurveys, loading, setLoading } = useSurveyStore()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoadError(null)
    setLoading(true)

    const unsub = subscribeToAuthorSurveys(
      user.uid,
      (data) => {
        setSurveys(data)
        setLoading(false)
      },
      (err) => {
        // onError: subscription was cancelled (permission denied, network, etc.)
        setLoading(false)
        setLoadError(err.message ?? 'Failed to load surveys.')
      }
    )

    return unsub
  }, [user, setSurveys, setLoading])

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.mySurveys')}</h1>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => navigate('/app/surveys/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('nav.newSurvey')}
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-sm">Loading your surveys…</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Could not load surveys</p>
            </div>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {loadError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg mb-4">{t('survey.noSurveys')}</p>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => navigate('/app/surveys/new')}
            >
              {t('survey.createFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
