import { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'
import { createSurvey, getSurveyById, saveSurvey } from '@/services/surveyService'
import AppShell from '@/components/shared/AppShell'
import BuilderCanvas from '@/components/builder/BuilderCanvas'
import BuilderSidebar from '@/components/builder/BuilderSidebar'
import BuilderHeader from '@/components/builder/BuilderHeader'

export default function SurveyBuilderPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { draft, initDraft, isDirty, isSaving, setIsSaving, setIsDirty } = useBuilderStore()

  useEffect(() => {
    if (!user) return
    if (id) {
      getSurveyById(id).then((survey) => {
        if (survey) initDraft(survey)
        else navigate('/app')
      })
    } else {
      createSurvey(user.uid).then((survey) => {
        initDraft(survey)
        navigate(`/app/surveys/${survey.id}/edit`, { replace: true })
      })
    }
  }, [id, user, initDraft, navigate])

  const handleSave = useCallback(async () => {
    if (!draft) return
    setIsSaving(true)
    try {
      await saveSurvey(draft)
      setIsDirty(false)
      toast.success(t('builder.saved'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }, [draft, setIsSaving, setIsDirty, t])

  // Auto-save on dirty with 2s debounce
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(handleSave, 2000)
    return () => clearTimeout(timer)
  }, [isDirty, handleSave])

  if (!draft) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <BuilderHeader onSave={handleSave} />
      <div className="flex flex-1 overflow-hidden">
        <BuilderSidebar />
        <BuilderCanvas />
      </div>
    </div>
  )
}
