import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Send, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeCanvas } from 'qrcode.react'
import { useBuilderStore } from '@/stores/builderStore'
import { publishSurvey, lockSurvey, unlockSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
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
  const [publishErrors, setPublishErrors] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)

  if (!draft) return null

  const surveyUrl = `${window.location.origin}/s/${draft.id}`

  // Collect every issue that would block a good survey experience
  const validateForPublish = (): string[] => {
    const issues: string[] = []

    // 1. Title required
    if (!draft.title.trim()) {
      issues.push('Survey title is required — add it in the Settings panel on the left.')
    }

    // 2. Must have at least one question
    const totalQuestions = draft.sectionOrder.reduce(
      (n, sid) => n + (draft.sections[sid]?.questionOrder?.length ?? 0), 0
    )
    if (totalQuestions === 0) {
      issues.push('Add at least one question to the canvas before publishing.')
    }

    // 3. Empty question prompts
    const allQuestions = Object.values(draft.questions)
    const emptyPrompts = allQuestions.filter((q) => !q.prompt.trim())
    if (emptyPrompts.length === 1) {
      issues.push(`1 question is missing its prompt text — look for the amber "Missing question text" badge.`)
    } else if (emptyPrompts.length > 1) {
      issues.push(`${emptyPrompts.length} questions are missing prompt text — look for amber badges on each card.`)
    }

    // 4. Radio / Checkbox need ≥ 2 options
    allQuestions.forEach((q) => {
      if ((q.type === 'radio' || q.type === 'checkbox') && (q.options ?? []).length < 2) {
        const label = q.prompt.trim() || 'Unnamed question'
        issues.push(`"${label}" needs at least 2 answer options (currently has ${(q.options ?? []).length}).`)
      }
    })

    // 5. Empty option labels
    const emptyLabelCount = allQuestions.reduce(
      (n, q) => n + (q.options?.filter((o) => !o.label.trim()).length ?? 0), 0
    )
    if (emptyLabelCount === 1) {
      issues.push('1 answer option has an empty label — fill it in or delete it.')
    } else if (emptyLabelCount > 1) {
      issues.push(`${emptyLabelCount} answer options have empty labels — fill them in or delete them.`)
    }

    // 6. Schedule conflict
    const { openAt, closeAt } = draft.schedule
    if (openAt && closeAt && openAt >= closeAt) {
      issues.push('Schedule error: open time must be before close time (check Settings → Schedule).')
    }

    return issues
  }

  const handlePublish = async () => {
    const issues = validateForPublish()
    if (issues.length > 0) {
      setPublishErrors(issues)
      setShowErrors(true)
      return
    }
    try {
      await onSave()
      await publishSurvey(draft.id)
      updateMeta({ status: 'published' } as never)
      toast.success('Survey published!')
      setShowQR(true)
    } catch (err) {
      console.error('Failed to publish:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to publish survey — the survey was not made public')
      toast.error(message, { description: detail })
    }
  }

  const handleLock = async () => {
    try {
      await lockSurvey(draft.id)
      updateMeta({ status: 'locked' } as never)
      toast.success('Survey locked.')
    } catch (err) {
      console.error('Failed to lock:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to lock survey — it may still be accepting responses')
      toast.error(message, { description: detail })
    }
  }

  const handleUnlock = async () => {
    try {
      await unlockSurvey(draft.id)
      updateMeta({ status: 'published' } as never)
      toast.success('Survey unlocked.')
    } catch (err) {
      console.error('Failed to unlock:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to unlock survey — it may still be locked')
      toast.error(message, { description: detail })
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`font-semibold truncate max-w-xs ${!draft.title.trim() ? 'text-gray-400 italic' : 'text-gray-800'}`}>
            {draft.title.trim() || 'Untitled Survey'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[draft.status]}`}>
            {t(`survey.status.${draft.status}`)}
          </span>
          {isDirty && (
            <span className="text-xs text-gray-400 shrink-0">{t('builder.unsavedChanges')}</span>
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

      {/* Validation errors dialog */}
      <Dialog open={showErrors} onOpenChange={setShowErrors}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Fix these issues before publishing
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-1">
            {publishErrors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 text-sm text-gray-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5"
              >
                <span className="text-red-400 shrink-0 font-bold">{i + 1}.</span>
                <span>{err}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
              onClick={() => setShowErrors(false)}
            >
              Go back and fix
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR code dialog */}
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
