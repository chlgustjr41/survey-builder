import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal, Trash2, Type } from 'lucide-react'
import { useBuilderStore } from '@/stores/builderStore'

interface Props {
  id: string
  content: string
  sectionId: string
}

export default function TextBlockCard({ id, content, sectionId }: Props) {
  const { t } = useTranslation()
  const { updateTextBlock, deleteTextBlock } = useBuilderStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Auto-grow
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
    updateTextBlock(id, e.target.value)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden border-l-4 border-l-sky-300${isDragging ? ' shadow-lg' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50/60 border-b border-gray-100">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-colors shrink-0 touch-none"
            title={t('builder.dragToReorder')}
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </button>

          <Type className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="text-[10px] font-semibold text-sky-500 uppercase tracking-widest flex-1 select-none">
            {t('builder.textBlockCard.title')}
          </span>

          <button
            type="button"
            onClick={() => deleteTextBlock(sectionId, id)}
            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            title={t('builder.textBlockCard.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editable content */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onFocus={(e) => {
              // Ensure correct height on focus
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            placeholder={t('builder.textBlockCard.placeholder')}
            rows={2}
            className="w-full text-sm text-gray-700 bg-transparent border-0 resize-none outline-none placeholder:text-gray-300 leading-relaxed overflow-hidden"
          />
        </div>
      </div>
    </div>
  )
}
