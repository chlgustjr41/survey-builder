import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Trash2, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import { uploadImage } from '@/services/storageService'
import { getErrorMessage } from '@/lib/errorMessage'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export default function EmailConfigEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  const [uploading, setUploading] = useState(false)
  if (!draft) return null

  const config = draft.emailConfig

  const update = (fields: Partial<typeof config>) =>
    updateMeta({ emailConfig: { ...config, ...fields } })

  const handleImageUpload = async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported (JPEG, PNG, GIF, WebP).')
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
    <div className="flex flex-col gap-3">
      {/* Enable toggle */}
      <label className="flex items-center justify-between gap-3 min-h-[28px] cursor-pointer">
        <span className="text-xs font-medium text-gray-700">{t('builder.email.enable')}</span>
        <Switch checked={config.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </label>

      {!config.enabled && (
        <p className="flex items-start gap-1.5 text-[11px] text-gray-400 leading-snug">
          <Mail className="w-3 h-3 mt-0.5 shrink-0" />
          Send respondents a personalised email with their results.
        </p>
      )}

      {config.enabled && (
        <div className="flex flex-col gap-3 pt-0.5">
          {/* Subject */}
          <Field label={t('builder.email.subject')}>
            <input
              value={config.subject}
              onChange={(e) => update({ subject: e.target.value })}
              placeholder="Your survey result"
              className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            />
          </Field>

          {/* Body */}
          <Field label={t('builder.email.body')}>
            <textarea
              rows={5}
              value={config.bodyHtml}
              onChange={(e) => update({ bodyHtml: e.target.value })}
              placeholder="<p>Thank you for completing the survey!</p>"
              className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              HTML is supported. Use <code className="bg-gray-100 px-1 rounded">{'{{score}}'}</code> to insert the respondent's score.
            </p>
          </Field>

          {/* Header image */}
          <Field label={t('builder.email.image')}>
            {config.imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img src={config.imageUrl} alt="" className="w-full h-24 object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/90 hover:bg-white shadow-sm"
                  onClick={() => {
                    // Omit imageUrl entirely — Firebase RTDB rejects explicit undefined
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
                Uploading…
              </div>
            ) : (
              <label className="flex flex-col items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-orange-500 border border-dashed border-gray-200 rounded-lg py-4 hover:border-orange-300 hover:bg-orange-50/40 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Click to upload</span>
                <span className="text-[10px]">JPG, PNG, GIF, WebP · max 5 MB</span>
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
          </Field>
        </div>
      )}
    </div>
  )
}

// ── Tiny shared field wrapper ─────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        {label}
      </p>
      {children}
    </div>
  )
}
