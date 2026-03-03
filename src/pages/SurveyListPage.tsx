import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, AlertTriangle, RefreshCw, FileText, Loader2, Upload, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useSurveyStore } from '@/stores/surveyStore'
import { subscribeToAuthorSurveys, createSurvey, importSurvey } from '@/services/surveyService'
import { uploadImage } from '@/services/storageService'
import { normalizeSurvey } from '@/lib/normalize'
import { remapSurveyIds } from '@/lib/remapSurveyIds'
import sampleTemplate from '@/data/sampleSurveyTemplate.json'
import { getErrorMessage } from '@/lib/errorMessage'
import AppShell from '@/components/shared/AppShell'
import SurveyCard from '@/components/shared/SurveyCard'

/** Compress an image URL to a ≤256 px JPEG data URL for QR canvas embedding. */
function compressImageToDataUrl(src: string, maxPx = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round((img.naturalWidth  || maxPx) * scale)
      canvas.height = Math.round((img.naturalHeight || maxPx) * scale)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } else {
        resolve(src)
      }
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

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
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { surveys, setSurveys, loading, setLoading } = useSurveyStore()
  const navigate = useNavigate()
  const [loadError, setLoadError]   = useState<string | null>(null)
  const [creating, setCreating]     = useState(false)
  const [importing, setImporting]   = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || importing) return
    // Reset so the same file can be re-selected after an error
    e.target.value = ''

    setImporting(true)
    try {
      const text = await file.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = JSON.parse(text)

      if (!raw || typeof raw !== 'object' || (!raw.title && !raw.sectionOrder && !raw.sections)) {
        toast.error('Invalid survey file — does not look like a survey export.')
        setImporting(false)
        return
      }

      // Strip export-only metadata fields before normalizing
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { __schema_version, __exported_at, id, authorId, createdAt, updatedAt, ...rest } = raw

      // Normalize to restore any missing defaults, then remap all internal IDs
      // so the imported copy has no ID linkage to the original survey.
      const normalized = remapSurveyIds(normalizeSurvey({
        ...rest,
        id: '',
        authorId: user.uid,
        status: 'draft',
        publishedAt: null,
        createdAt: 0,
        updatedAt: 0,
      }))

      const created = await importSurvey(user.uid, normalized)
      toast.success('Survey imported!')
      navigate(`/app/surveys/${created.id}/edit`)
    } catch (err) {
      const { message, detail } = getErrorMessage(err, 'Failed to import survey — check the file format and try again.')
      toast.error(message, { description: detail })
      setImporting(false)
    }
    // Don't reset `importing` on success — component unmounts on navigation
  }

  const handleUseTemplate = async () => {
    if (!user || loadingTemplate) return
    setLoadingTemplate(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { __schema_version, __exported_at, id, authorId, createdAt, updatedAt, ...rest } = sampleTemplate as any
      void __schema_version; void __exported_at; void id; void authorId; void createdAt; void updatedAt

      const normalized = remapSurveyIds(normalizeSurvey({
        ...rest,
        id: '',
        authorId: user.uid,
        status: 'draft',
        publishedAt: null,
        createdAt: 0,
        updatedAt: 0,
      }))

      // Upload a fresh copy of the app logo and generate a compressed data URL
      // for the template survey's QR code logo. Failures are non-fatal.
      try {
        const resp      = await fetch('/survey-builder-logo.svg')
        const blob      = await resp.blob()
        const logoFile  = new File([blob], 'survey-builder-logo.svg', { type: 'image/svg+xml' })
        const objectUrl = URL.createObjectURL(blob)
        const [logoUrl, logoDataUrl] = await Promise.all([
          uploadImage(logoFile, 'qr-logos'),
          compressImageToDataUrl(objectUrl),
        ])
        URL.revokeObjectURL(objectUrl)
        normalized.qrConfig = { ...normalized.qrConfig, logoUrl, logoDataUrl }
      } catch {
        // Logo upload failed — proceed without logo
      }

      const created = await importSurvey(user.uid, normalized)
      toast.success(t('survey.templateLoaded'))
      navigate(`/app/surveys/${created.id}/edit`)
    } catch (err) {
      const { message, detail } = getErrorMessage(err, 'Failed to load template.')
      toast.error(message, { description: detail })
      setLoadingTemplate(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Page header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <h1 className="text-2xl font-semibold text-gray-800">{t('nav.mySurveys')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('survey.listSubtitle')}</p>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
            <p className="text-sm">{t('survey.loading')}</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">{t('survey.loadError')}</p>
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
                {t('survey.startNew')}
              </p>
              <div className="flex gap-4 flex-wrap">
                {/* Blank survey */}
                <motion.button
                  onClick={handleCreateSurvey}
                  disabled={creating || importing}
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
                    {creating ? t('survey.creating') : t('survey.blank')}
                  </span>
                </motion.button>

                {/* Sample template */}
                <motion.button
                  onClick={handleUseTemplate}
                  disabled={creating || importing || loadingTemplate}
                  className="group flex flex-col gap-2 text-left disabled:opacity-60"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-36 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/60 transition-all flex items-center justify-center">
                    {loadingTemplate
                      ? <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
                      : <BookOpen className="w-8 h-8 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {loadingTemplate ? t('survey.importing') : t('survey.useTemplate')}
                  </span>
                </motion.button>

                {/* Import from file */}
                <motion.label
                  className={`group flex flex-col gap-2 text-left cursor-pointer ${importing || creating ? 'opacity-60 pointer-events-none' : ''}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-36 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/60 transition-all flex items-center justify-center">
                    {importing
                      ? <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
                      : <Upload className="w-8 h-8 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {importing ? t('survey.importing') : t('survey.importFromFile')}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </motion.label>
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
                    {t('survey.recent')}
                  </p>
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    variants={gridVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {surveys.map((survey) => (
                      <motion.div key={survey.id} variants={cardVariants} className="h-full">
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
                    <p className="font-medium text-gray-600 mb-1">{t('survey.noSurveysYet')}</p>
                    <p className="text-sm text-gray-400">{t('survey.noSurveysHint')}</p>
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
