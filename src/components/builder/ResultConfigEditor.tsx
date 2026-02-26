import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { Trash2, Upload, Loader2, Plus, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { uploadImage } from '@/services/storageService'
import { getErrorMessage } from '@/lib/errorMessage'
import type { ResultConfig, ScoreRange } from '@/types/survey'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

interface Props {
  config: ResultConfig
  onChange: (config: ResultConfig) => void
}

export default function ResultConfigEditor({ config, onChange }: Props) {
  const { t } = useTranslation()
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const updateConfig = (fields: Partial<ResultConfig>) =>
    onChange({ ...config, ...fields })

  const addRange = () => {
    const range: ScoreRange = { id: nanoid(), min: 0, max: 100, message: '' }
    updateConfig({ ranges: [...config.ranges, range] })
  }

  const updateRange = (id: string, fields: Partial<ScoreRange>) =>
    updateConfig({ ranges: config.ranges.map((r) => (r.id === id ? { ...r, ...fields } : r)) })

  const removeRange = (id: string) =>
    updateConfig({ ranges: config.ranges.filter((r) => r.id !== id) })

  // Never set imageUrl: undefined — Firebase RTDB rejects it
  const removeRangeImage = (rangeId: string) => {
    updateConfig({
      ranges: config.ranges.map((r) => {
        if (r.id !== rangeId) return r
        const { imageUrl: _removed, ...rest } = r
        return rest as ScoreRange
      }),
    })
  }

  const handleImageUpload = async (rangeId: string, file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported (JPEG, PNG, GIF, WebP).')
      return
    }
    setUploadingId(rangeId)
    try {
      const url = await uploadImage(file, 'result-images')
      updateRange(rangeId, { imageUrl: url })
    } catch (err) {
      console.error('Image upload failed:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to upload image.')
      toast.error(message, { description: detail })
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Show-score toggle */}
      <label className="flex items-center justify-between gap-3 min-h-[28px] cursor-pointer">
        <span className="text-xs font-medium text-gray-700">{t('builder.result.showScore')}</span>
        <Switch
          checked={config.showScore}
          onCheckedChange={(v) => updateConfig({ showScore: v })}
        />
      </label>

      {/* Score ranges */}
      {config.ranges.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Score Ranges
          </p>
          {config.ranges.map((range) => {
            const rangeError = range.max < range.min ? 'Max must be ≥ min' : null
            return (
              <div key={range.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Range header row */}
                <div className="flex items-center gap-1.5 bg-gray-50 border-b border-gray-100 px-2.5 py-1.5">
                  <BarChart2 className="w-3 h-3 text-gray-400 shrink-0" />
                  <input
                    type="number"
                    className={[
                      'w-14 text-xs text-center rounded border px-1.5 py-0.5 bg-white',
                      'focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-400',
                      rangeError ? 'border-red-400 bg-red-50' : 'border-gray-200',
                    ].join(' ')}
                    placeholder="Min"
                    value={range.min}
                    onChange={(e) => updateRange(range.id, { min: Number(e.target.value) })}
                  />
                  <span className="text-xs text-gray-400">–</span>
                  <input
                    type="number"
                    className={[
                      'w-14 text-xs text-center rounded border px-1.5 py-0.5 bg-white',
                      'focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-400',
                      rangeError ? 'border-red-400 bg-red-50' : 'border-gray-200',
                    ].join(' ')}
                    placeholder="Max"
                    value={range.max}
                    onChange={(e) => updateRange(range.id, { max: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-400">pts</span>
                  <button
                    onClick={() => removeRange(range.id)}
                    className="ml-auto p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {rangeError && (
                  <p className="text-[11px] text-red-500 px-2.5 py-1 bg-red-50 border-b border-red-100">
                    ⚠ {rangeError}
                  </p>
                )}

                <div className="p-2.5 flex flex-col gap-2">
                  {/* Message textarea */}
                  <textarea
                    rows={2}
                    className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                    placeholder={t('builder.result.message')}
                    value={range.message}
                    onChange={(e) => updateRange(range.id, { message: e.target.value })}
                  />

                  {/* Image */}
                  {range.imageUrl ? (
                    <div className="relative rounded overflow-hidden">
                      <img src={range.imageUrl} alt="" className="w-full h-16 object-cover" />
                      <button
                        onClick={() => removeRangeImage(range.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : uploadingId === range.id ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-200 rounded px-2 py-1.5 justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading…
                    </div>
                  ) : (
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer hover:text-orange-500 transition-colors">
                      <Upload className="w-3 h-3 shrink-0" />
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
              </div>
            )
          })}
        </div>
      )}

      {/* Add range */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-8 text-gray-500 border-dashed hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
        onClick={addRange}
      >
        <Plus className="w-3 h-3 mr-1" />
        {t('builder.result.addRange')}
      </Button>
    </div>
  )
}
