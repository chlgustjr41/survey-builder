import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Send, Lock, Unlock, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeCanvas } from 'qrcode.react'
import { useBuilderStore } from '@/stores/builderStore'
import { publishSurvey, lockSurvey, unlockSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
import { useState } from 'react'

interface Props { onSave: () => void }

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  locked:    'bg-orange-100 text-orange-700',
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

    if (!draft.title.trim()) {
      issues.push('Survey title is required — add it in the Settings panel on the left.')
    }

    const totalQuestions = draft.sectionOrder.reduce(
      (n, sid) => n + (draft.sections[sid]?.questionOrder?.length ?? 0), 0
    )
    if (totalQuestions === 0) {
      issues.push('Add at least one question to the canvas before publishing.')
    }

    const allQuestions = Object.values(draft.questions)
    const emptyPrompts = allQuestions.filter((q) => !q.prompt.trim())
    if (emptyPrompts.length === 1) {
      issues.push(`1 question is missing its prompt text — look for the amber "Missing question text" badge.`)
    } else if (emptyPrompts.length > 1) {
      issues.push(`${emptyPrompts.length} questions are missing prompt text — look for amber badges on each card.`)
    }

    allQuestions.forEach((q) => {
      if (q.type === 'choice' && (q.options ?? []).length < 2) {
        const label = q.prompt.trim() || 'Unnamed question'
        issues.push(`"${label}" needs at least 2 answer options (currently has ${(q.options ?? []).length}).`)
      }
    })

    const emptyLabelCount = allQuestions.reduce(
      (n, q) => n + (q.options?.filter((o) => !o.label.trim()).length ?? 0), 0
    )
    if (emptyLabelCount === 1) {
      issues.push('1 answer option has an empty label — fill it in or delete it.')
    } else if (emptyLabelCount > 1) {
      issues.push(`${emptyLabelCount} answer options have empty labels — fill them in or delete them.`)
    }

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
      await publishSurvey(draft.id, draft.authorId)
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
      await lockSurvey(draft.id, draft.authorId)
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
      await unlockSurvey(draft.id, draft.authorId)
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
      {/* ⚠ opacity-only — y/x on a structural element creates a CSS containing
          block that shifts position:fixed dialogs off-centre on the page.   */}
      <motion.header
        className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`font-semibold truncate max-w-xs ${!draft.title.trim() ? 'text-gray-400 italic' : 'text-gray-800'}`}>
            {draft.title.trim() || 'Untitled Survey'}
          </span>

          {/* Status pill */}
          <AnimatePresence mode="wait">
            <motion.span
              key={draft.status}
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[draft.status]}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
            >
              {t(`survey.status.${draft.status}`)}
            </motion.span>
          </AnimatePresence>

          {/* Dirty / saving indicator */}
          <AnimatePresence>
            {isSaving ? (
              <motion.span
                key="saving"
                className="flex items-center gap-1 text-xs text-orange-500 shrink-0"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('builder.saving')}
              </motion.span>
            ) : isDirty ? (
              <motion.span
                key="dirty"
                className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                {/* Pulsing dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                </span>
                {t('builder.unsavedChanges')}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? t('builder.saving') : t('builder.save')}
          </Button>

          <AnimatePresence mode="wait">
            {draft.status === 'draft' && (
              <motion.div
                key="publish-btn"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handlePublish}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {t('survey.publish')}
                </Button>
              </motion.div>
            )}
            {draft.status === 'published' && (
              <motion.div
                key="lock-btns"
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
                  <QrCode className="w-3.5 h-3.5 mr-1" />
                  {t('survey.qrCode')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleLock} className="text-orange-600 border-orange-300">
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  {t('survey.lock')}
                </Button>
              </motion.div>
            )}
            {draft.status === 'locked' && (
              <motion.div
                key="unlock-btn"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Button variant="outline" size="sm" onClick={handleUnlock}>
                  <Unlock className="w-3.5 h-3.5 mr-1" />
                  {t('survey.unlock')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

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
