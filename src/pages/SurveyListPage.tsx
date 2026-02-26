import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, RefreshCw, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useSurveyStore } from '@/stores/surveyStore'
import { subscribeToAuthorSurveys, createSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
import AppShell from '@/components/shared/AppShell'
import SurveyCard from '@/components/shared/SurveyCard'

// Stagger variants for the survey grid
const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden:  { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } },
}

export default function SurveyListPage() {
  const { user } = useAuthStore()
  const { surveys, setSurveys, loading, setLoading } = useSurveyStore()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoadError(null)
    setLoading(true)

    const unsub = subscribeToAuthorSurveys(
      user.uid,
      (data) => { setSurveys(data); setLoading(false) },
      (err) => { setLoading(false); setLoadError(err.message ?? 'Failed to load surveys.') }
    )

    return unsub
  }, [user, setSurveys, setLoading])

  /**
   * Creates a survey immediately and navigates to the editor.
   * Keeps creation in the list page so the builder page never calls createSurvey
   * (which previously caused double-creation via React StrictMode + auth re-fires).
   */
  const handleCreateSurvey = async () => {
    if (!user || creating) return
    setCreating(true)
    try {
      const survey = await createSurvey(user.uid)
      navigate(`/app/surveys/${survey.id}/edit`)
    } catch (err) {
      const { message, detail } = getErrorMessage(err, 'Failed to create survey — please try again')
      toast.error(message, { description: detail })
      setCreating(false)
    }
    // Don't reset `creating` on success — component unmounts on navigation
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <h1 className="text-2xl font-semibold text-gray-800">My Surveys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, manage, and share surveys</p>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
            <p className="text-sm">Loading your surveys…</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Could not load surveys</p>
            </div>
            <p className="text-sm text-gray-500 text-center max-w-sm">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* ── Start a new survey ─────────────────────────────────── */}
            <motion.section
              className="mb-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut', delay: 0.05 }}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Start a new survey
              </p>
              <div className="flex gap-4 flex-wrap">
                <motion.button
                  onClick={handleCreateSurvey}
                  disabled={creating}
                  className="group flex flex-col gap-2 text-left disabled:opacity-60"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-36 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/60 transition-all flex items-center justify-center">
                    {creating
                      ? <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
                      : <Plus className="w-8 h-8 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {creating ? 'Creating…' : 'Blank survey'}
                  </span>
                </motion.button>
              </div>
            </motion.section>

            {/* ── Recent surveys ──────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {surveys.length > 0 ? (
                <motion.section
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                    Recent surveys
                  </p>
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={gridVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {surveys.map((survey) => (
                      <motion.div key={survey.id} variants={cardVariants}>
                        <SurveyCard survey={survey} />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>
              ) : (
                <motion.div
                  key="empty"
                  className="flex flex-col items-center justify-center py-20 gap-4 text-center"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
                >
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 mb-1">No surveys yet</p>
                    <p className="text-sm text-gray-400">Click "Blank survey" above to create your first one</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </AppShell>
  )
}
