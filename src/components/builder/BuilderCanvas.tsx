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
import { Plus } from 'lucide-react'
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
