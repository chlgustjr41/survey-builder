import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import { uploadImage } from '@/services/storageService'
import type { ScoreRange } from '@/types/survey'

export default function ResultConfigEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  if (!draft) return null

  const config = draft.resultConfig

  const updateConfig = (fields: Partial<typeof config>) => {
    updateMeta({ resultConfig: { ...config, ...fields } })
  }

  const addRange = () => {
    const range: ScoreRange = { id: nanoid(), min: 0, max: 100, message: '' }
    updateConfig({ ranges: [...config.ranges, range] })
  }

  const updateRange = (id: string, fields: Partial<ScoreRange>) => {
    updateConfig({ ranges: config.ranges.map((r) => (r.id === id ? { ...r, ...fields } : r)) })
  }

  const removeRange = (id: string) => {
    updateConfig({ ranges: config.ranges.filter((r) => r.id !== id) })
  }

  const handleImageUpload = async (rangeId: string, file: File) => {
    const url = await uploadImage(file, 'result-images')
    updateRange(rangeId, { imageUrl: url })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{t('builder.result.showScore')}</label>
        <Switch checked={config.showScore} onCheckedChange={(v) => updateConfig({ showScore: v })} />
      </div>

      <div className="flex flex-col gap-3">
        {config.ranges.map((range) => (
          <div key={range.id} className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-7 text-xs"
                placeholder={t('builder.result.rangeMin')}
                value={range.min}
                onChange={(e) => updateRange(range.id, { min: Number(e.target.value) })}
              />
              <span className="text-xs text-gray-400">–</span>
              <Input
                type="number"
                className="h-7 text-xs"
                placeholder={t('builder.result.rangeMax')}
                value={range.max}
                onChange={(e) => updateRange(range.id, { max: Number(e.target.value) })}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeRange(range.id)}>
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
            <Textarea
              className="text-xs resize-none"
              rows={2}
              placeholder={t('builder.result.message')}
              value={range.message}
              onChange={(e) => updateRange(range.id, { message: e.target.value })}
            />
            {range.imageUrl ? (
              <div className="relative">
                <img src={range.imageUrl} alt="" className="w-full h-20 object-cover rounded" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-white/80"
                  onClick={() => updateRange(range.id, { imageUrl: undefined })}
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                <Upload className="w-3 h-3" />
                {t('builder.result.image')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(range.id, f)
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addRange}>
        + {t('builder.result.addRange')}
      </Button>
    </div>
  )
}
