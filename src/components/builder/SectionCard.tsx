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
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBuilderStore } from '@/stores/builderStore'
import type { Section } from '@/types/survey'
import type { QuestionType } from '@/types/question'
import QuestionCard from './QuestionCard'
import QuestionTypeMenu from './QuestionTypeMenu'
import BranchRuleEditor from './BranchRuleEditor'

interface Props { section: Section }

export default function SectionCard({ section }: Props) {
  const { t } = useTranslation()
  const { draft, updateSection, deleteSection, addQuestion, reorderQuestions } = useBuilderStore()
  const [collapsed, setCollapsed] = useState(false)
  const [showBranch, setShowBranch] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = section.questionOrder.indexOf(active.id as string)
    const newIndex = section.questionOrder.indexOf(over.id as string)
    reorderQuestions(section.id, arrayMove(section.questionOrder, oldIndex, newIndex))
  }

  const handleAddQuestion = (type: QuestionType) => {
    addQuestion(section.id, type)
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={() => setCollapsed((c) => !c)} className="text-gray-400">
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </button>
        <Input
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
          placeholder={t('builder.sectionTitle')}
          className="border-0 bg-transparent p-0 h-auto font-semibold text-sm focus-visible:ring-0 flex-1"
        />
        {section.branchRules.length > 0 && (
          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
            {section.branchRules.length} rule{section.branchRules.length > 1 ? 's' : ''}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-orange-500"
          onClick={() => setShowBranch(true)}
          title="Branch logic"
        >
          <GitBranch className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600"
          onClick={() => deleteSection(section.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Questions */}
      {!collapsed && (
        <div className="p-4 flex flex-col gap-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
            <SortableContext items={section.questionOrder} strategy={verticalListSortingStrategy}>
              {section.questionOrder.map((qId) => {
                const question = draft?.questions[qId]
                if (!question) return null
                return <QuestionCard key={qId} question={question} sectionId={section.id} />
              })}
            </SortableContext>
          </DndContext>

          <QuestionTypeMenu onSelect={handleAddQuestion} />
        </div>
      )}

      {/* Branch rule editor dialog */}
      {showBranch && (
        <BranchRuleEditor
          section={section}
          onClose={() => setShowBranch(false)}
        />
      )}
    </div>
  )
}
