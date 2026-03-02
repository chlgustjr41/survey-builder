import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode, Send, Lock, Unlock, AlertTriangle, Loader2, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useBuilderStore } from '@/stores/builderStore'
import QrCodeDisplay from '@/components/shared/QrCodeDisplay'
import type { QrCodeDisplayHandle } from '@/components/shared/QrCodeDisplay'
import { publishSurvey, lockSurvey, unlockSurvey } from '@/services/surveyService'
import { getErrorMessage } from '@/lib/errorMessage'
import { anonymizeSurveyIds } from '@/lib/remapSurveyIds'
import { useState, useRef } from 'react'

interface Props { onSave: () => Promise<void> }

interface ValidationIssue {
  message: string
  targetId?: string
  fallbackId?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  locked:    'bg-orange-100 text-orange-700',
}

// Shared hover animation for action buttons
const btnHover = { scale: 1.06 }
const btnTap   = { scale: 0.94 }
const btnTransition = { duration: 0.12 }

export default function BuilderHeader({ onSave }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { draft, isDirty, isSaving, updateMeta } = useBuilderStore()
  const [showQR, setShowQR] = useState(false)
  const [publishErrors, setPublishErrors] = useState<ValidationIssue[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const qrDisplayRef = useRef<QrCodeDisplayHandle>(null)

  if (!draft) return null

  const surveyUrl = `${window.location.origin}/s/${draft.id}`

  // Collect every issue that would block a good survey experience.
  // Hidden sections and questions are excluded — they are draft-only and
  // skipped entirely by the responder.
  const validateForPublish = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = []

    if (!draft.title.trim()) {
      issues.push({ message: t('builder.publish.noTitle'), targetId: 'builder-survey-title' })
    }

    // Only count questions inside visible sections that are not themselves hidden
    const visibleSectionIds = draft.sectionOrder.filter(
      (sid) => !draft.sections[sid]?.hidden
    )
    const visibleQuestions = Object.values(draft.questions).filter(
      (q) => !q.hidden && !draft.sections[q.sectionId]?.hidden
    )
    const visibleQuestionCount = visibleSectionIds.reduce(
      (n, sid) =>
        n +
        (draft.sections[sid]?.questionOrder?.filter(
          (qid) => !!draft.questions[qid] && !draft.questions[qid]?.hidden
        ).length ?? 0),
      0
    )
    if (visibleQuestionCount === 0) {
      // Point to the first visible section, or the title if none
      const firstVisibleSid = visibleSectionIds[0]
      issues.push({
        message: t('builder.publish.noQuestions'),
        targetId: firstVisibleSid ? `builder-section-${firstVisibleSid}` : 'builder-survey-title',
      })
    }

    // Questions with empty prompts — each gets its own scroll target
    visibleQuestions
      .filter((q) => !q.prompt.trim())
      .forEach((q) => {
        issues.push({
          message: t('builder.publish.missingText1Question', { n: q.prompt || t('builder.branchRules.untitledQuestion') }),
          targetId: `builder-question-${q.id}`,
          fallbackId: `builder-section-${q.sectionId}`,
        })
      })

    // Choice questions with fewer than 2 options
    visibleQuestions.forEach((q) => {
      if (q.type === 'choice' && (q.options ?? []).length < 2) {
        const label = q.prompt.trim() || t('builder.branchRules.untitledQuestion')
        issues.push({
          message: t('builder.publish.needsOptions', { label, count: q.options?.length ?? 0 }),
          targetId: `builder-question-${q.id}`,
          fallbackId: `builder-section-${q.sectionId}`,
        })
      }
    })

    // Options with blank labels — report per question that has them
    visibleQuestions.forEach((q) => {
      const blankCount = q.options?.filter((o) => !o.label.trim()).length ?? 0
      if (blankCount === 0) return
      const label = q.prompt.trim() || t('builder.branchRules.untitledQuestion')
      issues.push({
        message: blankCount === 1
          ? t('builder.publish.emptyOption1Question', { label })
          : t('builder.publish.emptyOptionManyQuestion', { label, count: blankCount }),
        targetId: `builder-question-${q.id}`,
        fallbackId: `builder-section-${q.sectionId}`,
      })
    })

    const { openAt, closeAt } = draft.schedule
    if (openAt && closeAt && openAt >= closeAt) {
      issues.push({ message: t('builder.publish.scheduleError') })
    }

    return issues
  }

  const scrollToIssue = (issue: ValidationIssue) => {
    setShowErrors(false)
    setTimeout(() => {
      const el =
        (issue.targetId ? document.getElementById(issue.targetId) : null) ??
        (issue.fallbackId ? document.getElementById(issue.fallbackId) : null)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
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
      toast.success(t('survey.publish') + '!')
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
      toast.success(t('survey.lock') + '!')
    } catch (err) {
      console.error('Failed to lock:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to lock survey — it may still be accepting responses')
      toast.error(message, { description: detail })
    }
  }

  const handleExport = () => {
    const anonymized = anonymizeSurveyIds(draft)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, authorId, createdAt, updatedAt, publishedAt, status, ...portable } = anonymized
    const payload = {
      __schema_version: 1,
      __exported_at: new Date().toISOString(),
      ...portable,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `survey-${draft.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'untitled'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUnlock = async () => {
    const issues = validateForPublish()
    if (issues.length > 0) {
      setPublishErrors(issues)
      setShowErrors(true)
      return
    }
    try {
      await onSave()
      await unlockSurvey(draft.id, draft.authorId)
      updateMeta({ status: 'published' } as never)
      toast.success(t('survey.unlock') + '!')
    } catch (err) {
      console.error('Failed to unlock:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to unlock survey — it may still be locked')
      toast.error(message, { description: detail })
    }
  }

  const handleDownloadQR = async () => {
    // High-resolution export: 5× the 200 px display size.
    // PADDING and BORDER scale with the same ratio so the card proportions
    // are pixel-identical to the on-screen preview.
    const QR_SIZE = 1000
    const PADDING = 60   // 12 px × 5
    const BORDER  = 10   // 2 px × 5
    const W       = BORDER * 2 + PADDING * 2 + QR_SIZE

    const RADIUS_MAP: Record<string, number> = { none: 0, sm: 40, md: 80, lg: 120 }
    const qrCfg       = draft.qrConfig ?? {}
    const borderRadius = RADIUS_MAP[qrCfg.borderRadius ?? 'md'] ?? 80
    const borderColor  = qrCfg.borderColor ?? '#e5e7eb'

    // ── 1. Render the QR + logo to a high-res PNG blob ───────────────────────
    // getPng(QR_SIZE) uses an offscreen QRCodeStyling instance with the same
    // options as the live display but at 5× resolution — identical QR matrix,
    // print-quality output.
    const qrBlob = await qrDisplayRef.current?.getPng(QR_SIZE)
    if (!qrBlob) return

    const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img    = new Image()
      const objUrl = URL.createObjectURL(qrBlob)
      img.onload   = () => { URL.revokeObjectURL(objUrl); resolve(img) }
      img.onerror  = () => { URL.revokeObjectURL(objUrl); reject(new Error('QR render failed')) }
      img.src      = objUrl
    })

    // ── 2. Wrap in the card canvas (white fill + rounded border) ─────────────
    const offscreen  = document.createElement('canvas')
    offscreen.width  = W
    offscreen.height = W
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    const rRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      if (r <= 0) ctx.rect(x, y, w, h)
      else        ctx.roundRect(x, y, w, h, r)
    }

    // White background
    rRect(0, 0, W, W, borderRadius)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Border (inset)
    ctx.strokeStyle = borderColor
    ctx.lineWidth   = BORDER
    rRect(BORDER / 2, BORDER / 2, W - BORDER, W - BORDER, Math.max(0, borderRadius - BORDER / 2))
    ctx.stroke()

    // QR — logo shape, clipping, and border are already baked into the blob
    // by QrCodeDisplay.shapeLogoDataUrl, so no further compositing needed.
    const qrOffset = BORDER + PADDING
    ctx.drawImage(qrImg, qrOffset, qrOffset, QR_SIZE, QR_SIZE)

    // ── 3. Trigger download ──────────────────────────────────────────────────
    const dataUrl = offscreen.toDataURL('image/png')
    const a       = document.createElement('a')
    a.href        = dataUrl
    a.download    = `qr-${draft.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'survey'}.png`
    a.click()
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
            {draft.title.trim() || t('builder.untitled')}
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
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={btnTransition}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title={t('builder.export')}
              className="text-gray-500 hover:text-gray-700"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {t('builder.export')}
            </Button>
          </motion.div>

          <motion.div whileHover={btnHover} whileTap={btnTap} transition={btnTransition}>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? t('builder.saving') : t('builder.save')}
            </Button>
          </motion.div>

          <AnimatePresence mode="wait">
            {draft.status === 'draft' && (
              <motion.div
                key="publish-btn"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
                whileHover={btnHover}
                whileTap={btnTap}
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
                <motion.div whileHover={btnHover} whileTap={btnTap} transition={btnTransition}>
                  <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
                    <QrCode className="w-3.5 h-3.5 mr-1" />
                    {t('survey.qrCode')}
                  </Button>
                </motion.div>
                <motion.div whileHover={btnHover} whileTap={btnTap} transition={btnTransition}>
                  <Button variant="outline" size="sm" onClick={handleLock} className="text-orange-600 border-orange-300">
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    {t('survey.lock')}
                  </Button>
                </motion.div>
              </motion.div>
            )}
            {draft.status === 'locked' && (
              <motion.div
                key="unlock-btn"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
                whileHover={btnHover}
                whileTap={btnTap}
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

      {/* Auto-lock banner — shown when a published survey was locked on entry */}
      <AnimatePresence>
        {draft.status === 'locked' && draft.publishedAt !== null && (
          <motion.div
            key="auto-lock-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 text-orange-500 shrink-0" />
              <p className="text-xs text-orange-700">{t('builder.publish.autoLocked')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation errors dialog */}
      <Dialog open={showErrors} onOpenChange={setShowErrors}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {t('builder.publish.fixIssues')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-1">
            {publishErrors.map((issue, i) => {
              const navigable = !!(issue.targetId || issue.fallbackId)
              return (
                <div
                  key={i}
                  onClick={navigable ? () => scrollToIssue(issue) : undefined}
                  className={`flex items-start gap-2.5 text-sm text-gray-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 transition-colors
                    ${navigable ? 'cursor-pointer hover:bg-red-100 hover:border-red-200' : ''}`}
                >
                  <span className="text-red-400 shrink-0 font-bold">{i + 1}.</span>
                  <span className="flex-1">{issue.message}</span>
                  {navigable && <span className="text-red-300 shrink-0">→</span>}
                </div>
              )
            })}
          </div>
          {publishErrors.some((issue) => issue.targetId || issue.fallbackId) && (
            <p className="text-[11px] text-gray-400 -mt-1">{t('builder.publish.clickToJump')}</p>
          )}
          <div className="flex justify-end pt-1">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
              onClick={() => setShowErrors(false)}
            >
              {t('builder.publish.goBackAndFix')}
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
            <div
              className="p-3 bg-white"
              style={{
                border: `2px solid ${draft.qrConfig?.borderColor ?? '#e5e7eb'}`,
                borderRadius: { none: 0, sm: 8, md: 16, lg: 24 }[draft.qrConfig?.borderRadius ?? 'md'] ?? 16,
              }}
            >
              <QrCodeDisplay ref={qrDisplayRef} value={surveyUrl} size={200} qrConfig={draft.qrConfig} />
            </div>
            <p className="text-xs text-gray-500 text-center break-all">{surveyUrl}</p>
            <p className="text-[11px] text-gray-400 text-center -mt-2">{t('survey.permanentLink')}</p>
            <div className="flex gap-2">
              <motion.div whileHover={btnHover} whileTap={btnTap} transition={btnTransition}>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(surveyUrl)
                  toast.success(t('survey.linkCopied'))
                }}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {t('survey.copyLink')}
                </Button>
              </motion.div>
              <motion.div whileHover={btnHover} whileTap={btnTap} transition={btnTransition}>
                <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {t('survey.downloadQR')}
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
