import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, AlignLeft, ListChecks, BarChart2, Type } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { QuestionType } from '@/types/question'

const TYPES: Array<{ type: QuestionType; icon: React.ReactNode; labelKey: string }> = [
  { type: 'text',   icon: <AlignLeft    className="w-4 h-4" />, labelKey: 'questionType.text'   },
  { type: 'choice', icon: <ListChecks   className="w-4 h-4" />, labelKey: 'questionType.choice' },
  { type: 'scale',  icon: <BarChart2    className="w-4 h-4" />, labelKey: 'questionType.scale'  },
]

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.15, ease: 'easeOut' as const },
  }),
}

interface Props {
  onSelect: (type: QuestionType) => void
  onAddTextBlock?: () => void
}

export default function QuestionTypeMenu({ onSelect, onAddTextBlock }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleSelect = (type: QuestionType) => {
    onSelect(type)
    setOpen(false)
  }

  const handleTextBlock = () => {
    onAddTextBlock?.()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-orange-500 border border-dashed border-gray-200 w-full">
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t('builder.addQuestion')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {TYPES.map(({ type, icon, labelKey }, i) => (
            <motion.button
              key={type}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              onClick={() => handleSelect(type)}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-gray-700 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.1 }}
            >
              <span className="text-gray-400">{icon}</span>
              {t(labelKey)}
            </motion.button>
          ))}
          {onAddTextBlock && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <motion.button
                custom={TYPES.length + 1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={handleTextBlock}
                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-gray-700 rounded hover:bg-sky-50 hover:text-sky-600 transition-colors"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.1 }}
              >
                <span className="text-gray-400"><Type className="w-4 h-4" /></span>
                {t('builder.textBlock')}
              </motion.button>
            </>
          )}
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}
