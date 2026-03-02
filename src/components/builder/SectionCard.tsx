import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { GripVertical, Trash2, GitBranch, ChevronDown, BarChart2, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { ResultConfig, Section } from '@/types/survey'
import { indexLabel } from '@/lib/utils'
import type { QuestionType } from '@/types/question'
import QuestionCard from './QuestionCard'
import TextBlockCard from './TextBlockCard'
import QuestionTypeMenu from './QuestionTypeMenu'
import ResultConfigEditor from './ResultConfigEditor'

interface Props {
  section: Section
  sectionIndex: number
  /** Called when the user clicks the branch-logic button.
   *  The dialog is rendered at BuilderCanvas level (outside all DnD/transform
   *  contexts) to avoid position:fixed containing-block issues. */
  onBranchEdit: (section: Section) => void
}

export default function SectionCard({ section, sectionIndex, onBranchEdit }: Props) {
  const { t } = useTranslation()
  const { draft, updateSection, deleteSection, addQuestion, addTextBlock, reorderQuestions, toggleSectionVisibility } = useBuilderStore()
  const fmt = draft?.formatConfig.sectionIndex ?? 'none'
  const sectionPrefix = indexLabel(sectionIndex, fmt)
  const [collapsed, setCollapsed]   = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // When dragging use the DnD opacity; hidden sections are also semi-transparent.
    // Applying opacity here (outer wrapper) covers the card AND all its questions,
    // giving a uniform greyed-out look when the whole section is hidden.
    opacity: isDragging ? 0.4 : (section.hidden ? 0.5 : 1),
  }

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = section.questionOrder.indexOf(active.id as string)
    const newIndex = section.questionOrder.indexOf(over.id as string)
    reorderQuestions(section.id, arrayMove(section.questionOrder, oldIndex, newIndex))
  }

  const handleAddQuestion = (type: QuestionType) => addQuestion(section.id, type)

  const resultConfig: ResultConfig = section.resultConfig ?? { showScore: false, ranges: [] }
  const hasResultConfig = resultConfig.ranges.length > 0
  const isHidden = section.hidden ?? false

  return (
    <div id={`builder-section-${section.id}`} ref={setNodeRef} style={style} className="flex flex-col gap-0">
      {/* ── Section header ────────────────────────────────────────────── */}
      <div className={`rounded-xl border shadow-sm overflow-hidden border-l-4 ${
        isHidden
          ? 'bg-gray-50 border-gray-200 border-l-gray-300'
          : 'bg-white border-gray-200 border-l-orange-400'
      }`}>
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-200 hover:text-gray-400 transition-colors shrink-0"
            title="Drag section"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
            title={collapsed ? 'Expand section' : 'Collapse section'}
          >
            <motion.span
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>

          {/* Section index prefix */}
          {sectionPrefix && (
            <span className="text-sm font-semibold text-orange-500 shrink-0">{sectionPrefix}</span>
          )}

          {/* Section title */}
          <Input
            value={section.title}
            onChange={(e) => updateSection(section.id, { title: e.target.value })}
            placeholder={t('builder.sectionTitle')}
            className="border-0 bg-transparent p-0 h-auto font-semibold text-sm text-gray-700 focus-visible:ring-0 flex-1 placeholder:text-gray-300"
          />

          {/* Branch-rule count badge */}
          {section.branchRules.length > 0 && (
            <motion.span
              className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium shrink-0"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {section.branchRules.length} rule{section.branchRules.length > 1 ? 's' : ''}
            </motion.span>
          )}

          {/* Result screen toggle */}
          <Button
            variant="ghost" size="icon"
            className={`h-7 w-7 shrink-0 transition-colors ${
              resultOpen || hasResultConfig
                ? 'text-orange-500 bg-orange-50'
                : 'text-gray-300 hover:text-orange-500'
            }`}
            title="Result screen"
            onClick={() => setResultOpen((o) => !o)}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </Button>

          {/* Visibility toggle */}
          <Button
            variant="ghost" size="icon"
            className={`h-7 w-7 shrink-0 transition-colors ${
              isHidden ? 'text-gray-400 bg-gray-100' : 'text-gray-300 hover:text-orange-500'
            }`}
            title={isHidden ? t('builder.section.show') : t('builder.section.hide')}
            onClick={() => toggleSectionVisibility(section.id)}
          >
            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>

          {/* Branch logic — opens dialog rendered at BuilderCanvas level */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-gray-300 hover:text-orange-500 shrink-0"
            title="Branch logic"
            onClick={() => onBranchEdit(section)}
          >
            <GitBranch className="w-3.5 h-3.5" />
          </Button>

          {/* Delete section */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0"
            title="Delete section"
            onClick={() => deleteSection(section.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Section description */}
        <div className="pb-2 px-4">
          <textarea
            ref={(el) => {
              if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
            }}
            value={section.description ?? ''}
            onChange={(e) => {
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
              updateSection(section.id, { description: el.value })
            }}
            placeholder="Section description (optional)"
            rows={1}
            className="w-full pl-10 text-xs text-gray-400 bg-transparent border-0 resize-none overflow-hidden outline-none placeholder:text-gray-300 focus:text-gray-600 transition-colors leading-relaxed"
          />
        </div>
      </div>

      {/* ── Per-section result config panel ──────────────────────────── */}
      <AnimatePresence initial={false}>
        {resultOpen && (
          <motion.div
            key="result-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-1 ml-4 bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-100 bg-orange-50/50">
                <BarChart2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="text-xs font-semibold text-orange-700">Result Screen</span>
                <span className="text-[10px] text-orange-400 ml-1">shown after this section</span>
              </div>
              <div className="p-4">
                <ResultConfigEditor
                  config={resultConfig}
                  onChange={(cfg) => updateSection(section.id, { resultConfig: cfg })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Questions ─────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="questions-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-3 pl-4 mt-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                <SortableContext items={section.questionOrder} strategy={verticalListSortingStrategy}>
                  <AnimatePresence initial={false}>
                    {(() => {
                      // Count only visible (non-hidden) questions for correct index labels
                      let visibleQuestionCount = 0
                      return section.questionOrder.map((qId) => {
                        const question = draft?.questions[qId]
                        if (question) {
                          // Assign index only to visible questions; hidden ones get -1
                          const idx = question.hidden ? -1 : visibleQuestionCount++
                          return (
                            // ⚠ No `layout` prop — it applies will-change:transform which
                            // creates a CSS containing block, breaking position:fixed dialogs.
                            <motion.div
                              key={qId}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                              <QuestionCard question={question} sectionId={section.id} questionIndex={idx} />
                            </motion.div>
                          )
                        }
                        const textBlock = draft?.textBlocks?.[qId]
                        if (textBlock) {
                          return (
                            <motion.div
                              key={qId}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                              <TextBlockCard id={qId} content={textBlock.content} sectionId={section.id} />
                            </motion.div>
                          )
                        }
                        return null
                      })
                    })()}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              <div className="pb-2">
                <QuestionTypeMenu
                  onSelect={handleAddQuestion}
                  onAddTextBlock={() => addTextBlock(section.id)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
