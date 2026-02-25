import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
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

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const unsub = subscribeToAuthorSurveys(user.uid, (data) => {
      setSurveys(data)
      setLoading(false)
    })
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
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
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
