import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Edit2, Trash2, BarChart2, QrCode, Lock, Unlock, Send, ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeCanvas } from 'qrcode.react'
import type { Survey } from '@/types/survey'
import { deleteSurvey, publishSurvey, lockSurvey, unlockSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
import { useSurveyStore } from '@/stores/surveyStore'

// ── Color banner ──────────────────────────────────────────────────────────────
const BANNERS = [
  'from-violet-400 to-purple-300',
  'from-blue-400 to-sky-300',
  'from-teal-400 to-emerald-300',
  'from-green-400 to-lime-300',
  'from-yellow-400 to-amber-300',
  'from-orange-400 to-amber-300',
  'from-pink-400 to-rose-300',
  'from-red-400 to-rose-300',
]
function bannerFor(id: string) {
  const hash = Array.from(id).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return BANNERS[hash % BANNERS.length]
}

const STATUS_PILL: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-500',
  published: 'bg-green-100 text-green-700',
  locked:    'bg-orange-100 text-orange-700',
}

interface Props { survey: Survey }

export default function SurveyCard({ survey }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { removeSurveyFromList, updateSurveyInList } = useSurveyStore()
  const [showQR, setShowQR] = useState(false)

  const surveyUrl = `${window.location.origin}/s/${survey.id}`

  // Prevent card-click from firing when action buttons are clicked
  const sp = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }

  const handleDelete = sp(async () => {
    if (!confirm(t('common.confirm'))) return
    try {
      await deleteSurvey(survey.id, survey.authorId)
      removeSurveyFromList(survey.id)
      toast.success('Survey deleted')
    } catch (err) {
      const { message, detail } = getErrorMessage(err, `Failed to delete "${survey.title}"`)
      toast.error(message, { description: detail })
    }
  })

  const handlePublish = sp(async () => {
    try {
      await publishSurvey(survey.id, survey.authorId)
      updateSurveyInList({ ...survey, status: 'published' })
      toast.success('Survey published')
      setShowQR(true)
    } catch (err) {
      const { message, detail } = getErrorMessage(err, `Failed to publish "${survey.title}"`)
      toast.error(message, { description: detail })
    }
  })

  const handleLock = sp(async () => {
    try {
      await lockSurvey(survey.id, survey.authorId)
      updateSurveyInList({ ...survey, status: 'locked' })
      toast.success('Survey locked')
    } catch (err) {
      const { message, detail } = getErrorMessage(err, `Failed to lock "${survey.title}"`)
      toast.error(message, { description: detail })
    }
  })

  const handleUnlock = sp(async () => {
    try {
      await unlockSurvey(survey.id, survey.authorId)
      updateSurveyInList({ ...survey, status: 'published' })
      toast.success('Survey unlocked')
    } catch (err) {
      const { message, detail } = getErrorMessage(err, `Failed to unlock "${survey.title}"`)
      toast.error(message, { description: detail })
    }
  })

  return (
    <>
      {/* Google-Forms-style card with hover lift */}
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/app/surveys/${survey.id}/edit`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/app/surveys/${survey.id}/edit`)}
        className="group rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {/* Gradient banner */}
        <div className={`h-24 bg-gradient-to-br ${bannerFor(survey.id)} flex items-end justify-end p-3`}>
          <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
            <ClipboardList className="w-4.5 h-4.5 text-white" />
          </div>
        </div>

        {/* Title + meta */}
        <div className="px-3 pt-2.5 pb-2 border-t border-gray-100">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug mb-1.5">
            {survey.title || 'Untitled Survey'}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[survey.status]}`}>
              {t(`survey.status.${survey.status}`)}
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(survey.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions — revealed on hover */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-t border-gray-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"
            title="Edit" onClick={sp(() => navigate(`/app/surveys/${survey.id}/edit`))}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"
            title="View responses" onClick={sp(() => navigate(`/app/surveys/${survey.id}/responses`))}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </Button>

          {survey.status === 'draft' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:bg-green-50 hover:text-green-700" title="Publish" onClick={handlePublish}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
          {survey.status === 'published' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700" title="QR / link" onClick={sp(() => setShowQR(true))}>
                <QrCode className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:bg-orange-50" title="Lock" onClick={handleLock}>
                <Lock className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {survey.status === 'locked' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700" title="Unlock" onClick={handleUnlock}>
              <Unlock className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* QR dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('survey.qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeCanvas value={surveyUrl} size={200} />
            <p className="text-xs text-gray-500 text-center break-all">{surveyUrl}</p>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(surveyUrl); toast.success(t('survey.linkCopied')) }}>
              {t('survey.copyLink')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
