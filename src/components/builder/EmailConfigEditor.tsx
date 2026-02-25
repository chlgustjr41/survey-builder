import { useTranslation } from 'react-i18next'
import { Upload, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import { uploadImage } from '@/services/storageService'

export default function EmailConfigEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const config = draft.emailConfig

  const update = (fields: Partial<typeof config>) => {
    updateMeta({ emailConfig: { ...config, ...fields } })
  }

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage(file, 'email-images')
    update({ imageUrl: url })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{t('builder.email.enable')}</label>
        <Switch checked={config.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>

      {config.enabled && (
        <>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('builder.email.subject')}</label>
            <Input
              className="text-xs"
              value={config.subject}
              onChange={(e) => update({ subject: e.target.value })}
              placeholder="Your survey result"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('builder.email.body')}</label>
            <Textarea
              className="text-xs resize-none font-mono"
              rows={5}
              value={config.bodyHtml}
              onChange={(e) => update({ bodyHtml: e.target.value })}
              placeholder="<p>Thank you for completing the survey!</p>"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">{t('builder.email.image')}</label>
            {config.imageUrl ? (
              <div className="relative">
                <img src={config.imageUrl} alt="" className="w-full h-24 object-cover rounded" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/80"
                  onClick={() => update({ imageUrl: undefined })}
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-600 border border-dashed border-gray-300 rounded p-3 justify-center">
                <Upload className="w-3 h-3" />
                Upload image
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
