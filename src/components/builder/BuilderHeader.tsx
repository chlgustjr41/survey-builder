import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Send, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeCanvas } from 'qrcode.react'
import { useBuilderStore } from '@/stores/builderStore'
import { publishSurvey, lockSurvey, unlockSurvey } from '@/services/surveyService'
import { useState } from 'react'

interface Props { onSave: () => void }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  locked: 'bg-orange-100 text-orange-700',
}

export default function BuilderHeader({ onSave }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { draft, isDirty, isSaving, updateMeta } = useBuilderStore()
  const [showQR, setShowQR] = useState(false)

  if (!draft) return null

  const surveyUrl = `${window.location.origin}/s/${draft.id}`

  const handlePublish = async () => {
    await onSave()
    await publishSurvey(draft.id)
    updateMeta({ status: 'published' } as never)
    toast.success('Survey published!')
    setShowQR(true)
  }

  const handleLock = async () => {
    await lockSurvey(draft.id)
    updateMeta({ status: 'locked' } as never)
  }

  const handleUnlock = async () => {
    await unlockSurvey(draft.id)
    updateMeta({ status: 'published' } as never)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <span className="font-semibold text-gray-800 truncate max-w-xs">
            {draft.title || 'Untitled Survey'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[draft.status]}`}>
            {t(`survey.status.${draft.status}`)}
          </span>
          {isDirty && (
            <span className="text-xs text-gray-400">{t('builder.unsavedChanges')}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? t('builder.saving') : t('builder.save')}
          </Button>

          {draft.status === 'draft' && (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handlePublish}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              {t('survey.publish')}
            </Button>
          )}
          {draft.status === 'published' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
                <QrCode className="w-3.5 h-3.5 mr-1" />
                {t('survey.qrCode')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLock} className="text-orange-600 border-orange-300">
                <Lock className="w-3.5 h-3.5 mr-1" />
                {t('survey.lock')}
              </Button>
            </>
          )}
          {draft.status === 'locked' && (
            <Button variant="outline" size="sm" onClick={handleUnlock}>
              <Unlock className="w-3.5 h-3.5 mr-1" />
              {t('survey.unlock')}
            </Button>
          )}
        </div>
      </header>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('survey.qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeCanvas value={surveyUrl} size={200} />
            <p className="text-xs text-gray-500 text-center break-all">{surveyUrl}</p>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(surveyUrl)
              toast.success(t('survey.linkCopied'))
            }}>
              {t('survey.copyLink')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
