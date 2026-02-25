import { useTranslation } from 'react-i18next'
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
import { Plus, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import SectionCard from './SectionCard'

export default function BuilderCanvas() {
  const { t } = useTranslation()
  const { draft, addSection, reorderSections } = useBuilderStore()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!draft) return null

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draft.sectionOrder.indexOf(active.id as string)
    const newIndex = draft.sectionOrder.indexOf(over.id as string)
    reorderSections(arrayMove(draft.sectionOrder, oldIndex, newIndex))
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {draft.sectionOrder.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-2xl">
            <LayoutList className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No sections yet</p>
            <p className="text-xs text-gray-400 mb-4">Click the button below to add your first section and start adding questions.</p>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={draft.sectionOrder} strategy={verticalListSortingStrategy}>
            {draft.sectionOrder.map((sectionId) => {
              const section = draft.sections[sectionId]
              if (!section) return null
              return <SectionCard key={sectionId} section={section} />
            })}
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          className="border-dashed border-gray-300 text-gray-400 hover:text-orange-500 hover:border-orange-300"
          onClick={addSection}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('builder.addSection')}
        </Button>
      </div>
    </main>
  )
}
