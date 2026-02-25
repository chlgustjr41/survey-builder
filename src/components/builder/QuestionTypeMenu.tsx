import { useTranslation } from 'react-i18next'
import { Plus, CheckSquare, Circle, AlignLeft, AlignJustify, Star, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { QuestionType } from '@/types/question'

const TYPES: Array<{ type: QuestionType; icon: React.ReactNode; labelKey: string }> = [
  { type: 'radio', icon: <Circle className="w-4 h-4" />, labelKey: 'questionType.radio' },
  { type: 'checkbox', icon: <CheckSquare className="w-4 h-4" />, labelKey: 'questionType.checkbox' },
  { type: 'text-short', icon: <AlignLeft className="w-4 h-4" />, labelKey: 'questionType.text-short' },
  { type: 'text-long', icon: <AlignJustify className="w-4 h-4" />, labelKey: 'questionType.text-long' },
  { type: 'rating', icon: <Star className="w-4 h-4" />, labelKey: 'questionType.rating' },
  { type: 'tag-input', icon: <Tag className="w-4 h-4" />, labelKey: 'questionType.tag-input' },
]

interface Props { onSelect: (type: QuestionType) => void }

export default function QuestionTypeMenu({ onSelect }: Props) {
  const { t } = useTranslation()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-orange-500 border border-dashed border-gray-200 w-full">
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t('builder.addQuestion')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {TYPES.map(({ type, icon, labelKey }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-gray-700 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <span className="text-gray-400">{icon}</span>
            {t(labelKey)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
