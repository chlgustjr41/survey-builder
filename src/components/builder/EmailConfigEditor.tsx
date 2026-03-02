import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Trash2, Loader2, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import { uploadImage } from '@/services/storageService'
import { getErrorMessage } from '@/lib/errorMessage'

function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function EmailConfigEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  const [uploading, setUploading] = useState(false)
  if (!draft) return null

  const config = draft.emailConfig

  // Email automation requires an email identification field to be active
  const emailFieldEnabled = draft.identificationFields.some((f) => f.fieldKey === 'email')

  const update = (fields: Partial<typeof config>) =>
    updateMeta({ emailConfig: { ...config, ...fields } })

  const handleImageUpload = async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('builder.email.imageTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }))
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('builder.email.invalidImageType'))
      return
    }
    setUploading(true)
    try {
      const url = await uploadImage(file, 'email-images')
      update({ imageUrl: url })
    } catch (err) {
      console.error('Image upload failed:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to upload image.')
      toast.error(message, { description: detail })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Enable ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.email.automation')}
        </p>

        {/* Blocked note — shown when email identification field is not enabled */}
        {!emailFieldEnabled && (
          <p className="flex items-start gap-1.5 text-[11px] text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-3 py-2 leading-snug">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            {t('builder.email.emailFieldRequired')}
          </p>
        )}

        <label className={`flex items-center justify-between gap-3 min-h-7 ${emailFieldEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
          <span className="text-xs font-medium text-gray-700">{t('builder.email.enable')}</span>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            disabled={!emailFieldEnabled}
          />
        </label>

        {!config.enabled && emailFieldEnabled && (
          <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-snug">
            <Mail className="w-3 h-3 mt-0.5 shrink-0" />
            {t('builder.email.enableHint')}
          </p>
        )}
      </div>

      {/* ── Content (only when enabled) ────────────────────────────────────── */}
      {config.enabled && (
        <>
          <Divider />

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.email.subject')}
            </p>
            <input
              value={config.subject}
              onChange={(e) => update({ subject: e.target.value })}
              placeholder={t('builder.email.subjectPlaceholder')}
              className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            />
          </div>

          <Divider />

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.email.body')}
            </p>
            <textarea
              rows={5}
              value={config.bodyHtml}
              onChange={(e) => update({ bodyHtml: e.target.value })}
              placeholder={t('builder.email.bodyPlaceholder')}
              className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            />
            <p className="text-[10px] text-gray-400">
              {t('builder.email.htmlHint').split('{{score}}')[0]}<code className="bg-gray-100 px-1 rounded">{'{{score}}'}</code>{t('builder.email.htmlHint').split('{{score}}')[1]}
            </p>
          </div>

          <Divider />

          {/* Header image */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.email.image')}
            </p>
            {config.imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img src={config.imageUrl} alt="" className="w-full h-24 object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/90 hover:bg-white shadow-sm"
                  onClick={() => {
                    const { imageUrl: _removed, ...rest } = config
                    updateMeta({ emailConfig: rest })
                  }}
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ) : uploading ? (
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('builder.email.uploading')}
              </div>
            ) : (
              <label className="flex flex-col items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-orange-500 border border-dashed border-gray-200 rounded-lg py-4 hover:border-orange-300 hover:bg-orange-50/40 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{t('builder.email.clickToUpload')}</span>
                <span className="text-[10px]">{t('builder.email.uploadHint')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(f)
                  }}
                />
              </label>
            )}
          </div>
        </>
      )}

    </div>
  )
}
