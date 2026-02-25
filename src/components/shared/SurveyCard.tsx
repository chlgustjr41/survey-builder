import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Edit2, Trash2, BarChart2, QrCode, Lock, Unlock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeCanvas } from 'qrcode.react'
import type { Survey } from '@/types/survey'
import {
  deleteSurvey,
  publishSurvey,
  lockSurvey,
  unlockSurvey,
} from '@/services/surveyService'
import { useSurveyStore } from '@/stores/surveyStore'

interface Props { survey: Survey }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  locked: 'bg-orange-100 text-orange-700',
}

export default function SurveyCard({ survey }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { removeSurveyFromList, updateSurveyInList } = useSurveyStore()
  const [showQR, setShowQR] = useState(false)

  const surveyUrl = `${window.location.origin}/s/${survey.id}`

  const handleDelete = async () => {
    if (!confirm(t('common.confirm'))) return
    try {
      await deleteSurvey(survey.id)
      removeSurveyFromList(survey.id)
      toast.success('Survey deleted')
    } catch (err) {
      console.error('Failed to delete survey:', err)
      toast.error('Failed to delete survey. Please try again.')
    }
  }

  const handlePublish = async () => {
    try {
      await publishSurvey(survey.id)
      updateSurveyInList({ ...survey, status: 'published' })
      toast.success('Survey published')
      setShowQR(true)
    } catch (err) {
      console.error('Failed to publish survey:', err)
      toast.error('Failed to publish survey. Please try again.')
    }
  }

  const handleLock = async () => {
    try {
      await lockSurvey(survey.id)
      updateSurveyInList({ ...survey, status: 'locked' })
      toast.success('Survey locked')
    } catch (err) {
      console.error('Failed to lock survey:', err)
      toast.error('Failed to lock survey. Please try again.')
    }
  }

  const handleUnlock = async () => {
    try {
      await unlockSurvey(survey.id)
      updateSurveyInList({ ...survey, status: 'published' })
      toast.success('Survey unlocked')
    } catch (err) {
      console.error('Failed to unlock survey:', err)
      toast.error('Failed to unlock survey. Please try again.')
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(surveyUrl)
    toast.success(t('survey.linkCopied'))
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{survey.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[survey.status]}`}>
                {t(`survey.status.${survey.status}`)}
              </span>
            </div>
            {survey.description && (
              <p className="text-sm text-gray-500 truncate">{survey.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(survey.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/surveys/${survey.id}/edit`)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/surveys/${survey.id}/responses`)}>
              <BarChart2 className="w-4 h-4" />
            </Button>
            {survey.status === 'draft' && (
              <Button variant="ghost" size="icon" onClick={handlePublish} className="text-green-600 hover:text-green-700">
                <Send className="w-4 h-4" />
              </Button>
            )}
            {survey.status === 'published' && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setShowQR(true)}>
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLock} className="text-orange-500">
                  <Lock className="w-4 h-4" />
                </Button>
              </>
            )}
            {survey.status === 'locked' && (
              <Button variant="ghost" size="icon" onClick={handleUnlock} className="text-gray-500">
                <Unlock className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('survey.qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeCanvas value={surveyUrl} size={200} />
            <p className="text-xs text-gray-500 text-center break-all">{surveyUrl}</p>
            <Button variant="outline" size="sm" onClick={copyLink}>
              {t('survey.copyLink')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
