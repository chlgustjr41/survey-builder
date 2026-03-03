import { useEffect, useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'
import { getSurveyById, saveSurvey, lockSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
import BuilderCanvas from '@/components/builder/BuilderCanvas'
import BuilderSidebar from '@/components/builder/BuilderSidebar'
import BuilderHeader from '@/components/builder/BuilderHeader'

export default function SurveyBuilderPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { draft, initDraft, clearDraft, isDirty, setIsSaving, setIsDirty } = useBuilderStore()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  /**
   * Tracks the survey ID that has been loaded into the builder store so we never
   * call initDraft() twice for the same survey (e.g. on fast re-renders / StrictMode).
   */
  const loadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Survey ID is always required — redirect if missing
    if (!user || !id) {
      navigate('/app', { replace: true })
      return
    }

    // Already loaded this survey — skip re-fetch to preserve any unsaved edits
    if (loadedIdRef.current === id) return

    // Clear the previous survey immediately so the loading spinner appears
    // instead of showing stale content during the network fetch.
    clearDraft()
    loadedIdRef.current = null

    let cancelled = false

    getSurveyById(id).then(async (survey) => {
      if (cancelled) return
      if (survey) {
        loadedIdRef.current = id
        // Auto-lock published surveys while the builder is open so respondents
        // cannot submit during an in-progress edit.
        if (survey.status === 'published') {
          try { await lockSurvey(survey.id, survey.authorId) } catch { /* non-blocking */ }
          initDraft({ ...survey, status: 'locked' })
        } else {
          initDraft(survey)
        }
      } else {
        navigate('/app', { replace: true })
      }
    })

    return () => { cancelled = true }
  }, [id, user, initDraft, clearDraft, navigate])

  // Core save — silent=true for auto-save (no toast noise every 2s)
  const handleSave = useCallback(async (silent = false) => {
    if (!draft) return
    setIsSaving(true)
    try {
      await saveSurvey(draft)
      setIsDirty(false)
      if (!silent) toast.success(t('builder.saved'))
    } catch (err) {
      const { message, detail } = getErrorMessage(err, 'Failed to save survey — your changes may not have been saved')
      toast.error(message, { description: detail })
    } finally {
      setIsSaving(false)
    }
  }, [draft, setIsSaving, setIsDirty, t])

  // Auto-save on dirty with 2s debounce — runs silently
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => handleSave(true), 2000)
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
    <div className="flex flex-col h-screen bg-gray-100">
      <BuilderHeader onSave={handleSave} />
      <div className="flex flex-1 overflow-hidden">
        <BuilderSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <BuilderCanvas sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />
      </div>
    </div>
  )
}
