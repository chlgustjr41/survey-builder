import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { GripVertical, Trash2, Upload, Loader2, Plus, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { uploadImage } from '@/services/storageService'
import { getErrorMessage } from '@/lib/errorMessage'
import type { ResultConfig, ScoreRange } from '@/types/survey'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

interface Props {
  config: ResultConfig
  onChange: (config: ResultConfig) => void
  /** When true, scoring is disabled survey-wide — the Result Messages section is active */
  scoringDisabled?: boolean
  /** When false, the "Hide from respondents" toggle is suppressed (parent controls it) */
  showHideToggle?: boolean
}

export default function ResultConfigEditor({ config, onChange, scoringDisabled = false, showHideToggle = true }: Props) {
  const { t } = useTranslation()
  const [uploadingRangeId, setUploadingRangeId]     = useState<string | null>(null)
  const [uploadingMessageId, setUploadingMessageId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const updateConfig = (fields: Partial<ResultConfig>) =>
    onChange({ ...config, ...fields })

  const hideResults = config.hideResults ?? false

  // ── Score Ranges handlers (config.ranges) ────────────────────────────────────
  const addRange = () => {
    const range: ScoreRange = { id: nanoid(), min: 0, max: 100, message: '' }
    updateConfig({ ranges: [...config.ranges, range] })
  }

  const updateRange = (id: string, fields: Partial<ScoreRange>) =>
    updateConfig({ ranges: config.ranges.map((r) => (r.id === id ? { ...r, ...fields } : r)) })

  const removeRange = (id: string) =>
    updateConfig({ ranges: config.ranges.filter((r) => r.id !== id) })

  const removeRangeImage = (rangeId: string) => {
    updateConfig({
      ranges: config.ranges.map((r) => {
        if (r.id !== rangeId) return r
        const { imageUrl: _removed, ...rest } = r
        return rest as ScoreRange
      }),
    })
  }

  const handleRangeImageUpload = async (rangeId: string, file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('builder.email.imageTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }))
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('builder.email.invalidImageType'))
      return
    }
    setUploadingRangeId(rangeId)
    try {
      const url = await uploadImage(file, 'result-images')
      updateRange(rangeId, { imageUrl: url })
    } catch (err) {
      console.error('Image upload failed:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to upload image.')
      toast.error(message, { description: detail })
    } finally {
      setUploadingRangeId(null)
    }
  }

  const handleRangeDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = config.ranges.findIndex((r) => r.id === active.id)
    const to   = config.ranges.findIndex((r) => r.id === over.id)
    updateConfig({ ranges: arrayMove(config.ranges, from, to) })
  }

  // ── Result Messages handlers (config.messages) ───────────────────────────────
  const messages = config.messages ?? []

  const addMessage = () => {
    const msg: ScoreRange = { id: nanoid(), min: 0, max: 0, message: '' }
    updateConfig({ messages: [...messages, msg] })
  }

  const updateMessage = (id: string, fields: Partial<ScoreRange>) =>
    updateConfig({ messages: messages.map((m) => (m.id === id ? { ...m, ...fields } : m)) })

  const removeMessage = (id: string) =>
    updateConfig({ messages: messages.filter((m) => m.id !== id) })

  const removeMessageImage = (msgId: string) => {
    updateConfig({
      messages: messages.map((m) => {
        if (m.id !== msgId) return m
        const { imageUrl: _removed, ...rest } = m
        return rest as ScoreRange
      }),
    })
  }

  const handleMessageImageUpload = async (msgId: string, file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('builder.email.imageTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }))
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('builder.email.invalidImageType'))
      return
    }
    setUploadingMessageId(msgId)
    try {
      const url = await uploadImage(file, 'result-images')
      updateMessage(msgId, { imageUrl: url })
    } catch (err) {
      console.error('Image upload failed:', err)
      const { message, detail } = getErrorMessage(err, 'Failed to upload image.')
      toast.error(message, { description: detail })
    } finally {
      setUploadingMessageId(null)
    }
  }

  const handleMessageDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = messages.findIndex((m) => m.id === active.id)
    const to   = messages.findIndex((m) => m.id === over.id)
    updateConfig({ messages: arrayMove(messages, from, to) })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hide results toggle — shown only when parent doesn't control it */}
      {showHideToggle && (
        <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
          <span className="text-xs font-medium text-gray-700">{t('builder.result.hideResults')}</span>
          <Switch
            checked={hideResults}
            onCheckedChange={(v) => updateConfig({ hideResults: v })}
          />
        </label>
      )}

      {/* Both result mode sections — hidden only when the whole screen is hidden */}
      {!hideResults && (
        <>
          {/* ── Score Ranges section ─────────────────────────────────────
              Active when scoring is enabled; greyed-out when scoring is off */}
          <div
            className={[
              'flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-opacity duration-200',
              scoringDisabled
                ? 'opacity-40 pointer-events-none select-none border-gray-100 bg-gray-50/50'
                : 'border-orange-100 bg-orange-50/30',
            ].join(' ')}
          >
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.result.scoreRanges')}
            </p>

            {/* Show score toggle */}
            <label className="flex items-center justify-between gap-3 min-h-7 cursor-pointer">
              <span className="text-xs font-medium text-gray-700">{t('builder.result.showScore')}</span>
              <Switch
                checked={config.showScore}
                onCheckedChange={(v) => updateConfig({ showScore: v })}
              />
            </label>

            {/* Sortable score ranges */}
            {config.ranges.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRangeDragEnd}>
                <SortableContext items={config.ranges.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {config.ranges.map((range) => {
                      const rangeError = range.max < range.min ? t('builder.result.rangeMaxError') : null
                      return (
                        <SortableRangeCard
                          key={range.id}
                          id={range.id}
                          range={range}
                          showMinMax
                          rangeError={rangeError}
                          uploadingId={uploadingRangeId}
                          onUpdate={(f) => updateRange(range.id, f)}
                          onRemove={() => removeRange(range.id)}
                          onRemoveImage={() => removeRangeImage(range.id)}
                          onUploadImage={(file) => handleRangeImageUpload(range.id, file)}
                          messagePlaceholder={t('builder.result.message')}
                          imageLabel={t('builder.result.image')}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

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

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dashed border-gray-200" />
            <span className="text-[10px] text-gray-300 font-medium shrink-0">
              {t('builder.result.orLabel')}
            </span>
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>

          {/* ── Result Messages section ──────────────────────────────────
              Active when scoring is disabled; greyed-out when scoring is on */}
          <div
            className={[
              'flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-opacity duration-200',
              !scoringDisabled
                ? 'opacity-40 pointer-events-none select-none border-gray-100 bg-gray-50/50'
                : 'border-orange-100 bg-orange-50/30',
            ].join(' ')}
          >
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.result.resultMessages')}
            </p>

            {/* Sortable result messages — unconditional, no min/max */}
            {messages.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMessageDragEnd}>
                <SortableContext items={messages.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {messages.map((msg) => (
                      <SortableRangeCard
                        key={msg.id}
                        id={msg.id}
                        range={msg}
                        showMinMax={false}
                        rangeError={null}
                        uploadingId={uploadingMessageId}
                        onUpdate={(f) => updateMessage(msg.id, f)}
                        onRemove={() => removeMessage(msg.id)}
                        onRemoveImage={() => removeMessageImage(msg.id)}
                        onUploadImage={(file) => handleMessageImageUpload(msg.id, file)}
                        messagePlaceholder={t('builder.result.message')}
                        imageLabel={t('builder.result.image')}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 text-gray-500 border-dashed hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              onClick={addMessage}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('builder.result.addResultMessage')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────
interface SortableRangeCardProps extends Omit<RangeCardProps, 'dragHandleAttributes' | 'dragHandleListeners' | 'isDragging'> {
  id: string
}

function SortableRangeCard({ id, ...props }: SortableRangeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-50' : ''}
    >
      <RangeCard
        {...props}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  )
}

// ── Shared range card ──────────────────────────────────────────────────────────
interface RangeCardProps {
  range: ScoreRange
  showMinMax: boolean
  rangeError: string | null
  uploadingId: string | null
  onUpdate: (fields: Partial<ScoreRange>) => void
  onRemove: () => void
  onRemoveImage: () => void
  onUploadImage: (file: File) => void
  messagePlaceholder: string
  imageLabel: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleAttributes?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleListeners?: Record<string, any>
  isDragging?: boolean
}

function RangeCard({
  range, showMinMax, rangeError, uploadingId,
  onUpdate, onRemove, onRemoveImage, onUploadImage,
  messagePlaceholder, imageLabel,
  dragHandleAttributes, dragHandleListeners, isDragging,
}: RangeCardProps) {
  const { t } = useTranslation()
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden${isDragging ? ' shadow-lg opacity-90' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-1 bg-gray-50 border-b border-gray-100 px-2 py-1.5">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-0.5 rounded text-gray-300 hover:text-gray-400 transition-colors shrink-0 touch-none"
          {...dragHandleAttributes}
          {...dragHandleListeners}
        >
          <GripVertical className="w-3 h-3" />
        </button>

        {showMinMax ? (
          <>
            <BarChart2 className="w-3 h-3 text-gray-400 shrink-0" />
            <input
              type="number"
              className={[
                'w-12 text-xs text-center rounded border px-1 py-0.5 bg-white',
                'focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-400',
                rangeError ? 'border-red-400 bg-red-50' : 'border-gray-200',
              ].join(' ')}
              placeholder={t('builder.result.rangeMinPlaceholder')}
              value={range.min}
              onChange={(e) => onUpdate({ min: Number(e.target.value) })}
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="number"
              className={[
                'w-12 text-xs text-center rounded border px-1 py-0.5 bg-white',
                'focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-400',
                rangeError ? 'border-red-400 bg-red-50' : 'border-gray-200',
              ].join(' ')}
              placeholder={t('builder.result.rangeMaxPlaceholder')}
              value={range.max}
              onChange={(e) => onUpdate({ max: Number(e.target.value) })}
            />
            <span className="text-[10px] text-gray-400 shrink-0">{t('builder.pts')}</span>
          </>
        ) : (
          <span className="flex-1 text-[11px] text-gray-400 italic">{t('builder.result.alwaysShown')}</span>
        )}
        <button
          onClick={onRemove}
          className="ml-auto p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
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
        <textarea
          rows={2}
          className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
          placeholder={messagePlaceholder}
          value={range.message}
          onChange={(e) => onUpdate({ message: e.target.value })}
        />

        {range.imageUrl ? (
          <div className="relative rounded overflow-hidden">
            <img src={range.imageUrl} alt="" className="w-full h-16 object-cover" />
            <button
              onClick={onRemoveImage}
              className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : uploadingId === range.id ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-200 rounded px-2 py-1.5 justify-center">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('builder.email.uploading')}
          </div>
        ) : (
          <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer hover:text-orange-500 transition-colors">
            <Upload className="w-3 h-3 shrink-0" />
            {imageLabel}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadImage(f)
              }}
            />
          </label>
        )}
      </div>
    </div>
  )
}
