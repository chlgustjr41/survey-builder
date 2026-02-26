import { useState } from 'react'
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
import { Plus, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import type { Section } from '@/types/survey'
import SectionCard from './SectionCard'
import BranchRuleEditor from './BranchRuleEditor'

export default function BuilderCanvas() {
  const { draft, addSection, updateMeta, reorderSections } = useBuilderStore()

  /**
   * Branch logic dialog state is owned HERE (at canvas level), completely
   * outside the DnD sortable context and any Framer Motion transform context.
   * This ensures the Radix Dialog portal renders without any CSS containing-block
   * interference that would shift its position:fixed centering.
   */
  const [branchSection, setBranchSection] = useState<Section | null>(null)

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
    <>
      <main className="flex-1 overflow-y-auto bg-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* ── Form header card ──────────────────────────────────────── */}
          <motion.div
            className="bg-white rounded-xl shadow-sm overflow-hidden border-t-[5px] border-orange-500"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="px-7 py-6">
              <input
                value={draft.title}
                onChange={(e) => updateMeta({ title: e.target.value })}
                placeholder="Untitled Survey"
                className={`w-full text-3xl font-bold bg-transparent outline-none border-b pb-1 mb-3
                  placeholder:text-gray-300 transition-colors
                  ${draft.title.trim()
                    ? 'border-transparent hover:border-gray-200 focus:border-orange-400 text-gray-900'
                    : 'border-amber-300 text-amber-500 focus:border-orange-400'
                  }`}
              />
              <input
                value={draft.description}
                onChange={(e) => updateMeta({ description: e.target.value })}
                placeholder="Form description (optional)"
                className="w-full text-sm text-gray-500 bg-transparent outline-none border-b border-transparent
                  hover:border-gray-200 focus:border-gray-300 pb-0.5 placeholder:text-gray-300 transition-colors"
              />
            </div>
          </motion.div>

          {/* ── Sections ──────────────────────────────────────────────── */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={draft.sectionOrder} strategy={verticalListSortingStrategy}>
              {draft.sectionOrder.map((sectionId, sectionIndex) => {
                const section = draft.sections[sectionId]
                if (!section) return null
                return (
                  <SectionCard
                    key={sectionId}
                    section={section}
                    sectionIndex={sectionIndex}
                    onBranchEdit={setBranchSection}
                  />
                )
              })}
            </SortableContext>
          </DndContext>

          {/* ── Empty state ───────────────────────────────────────────── */}
          {draft.sectionOrder.length === 0 && (
            <motion.div
              className="flex flex-col items-center justify-center text-center py-14 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
            >
              <HelpCircle className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400 mb-1">No sections yet</p>
              <p className="text-xs text-gray-300 mb-5">Add a section to start building your survey</p>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={addSection}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add first section
              </Button>
            </motion.div>
          )}

          {/* ── Add another section ───────────────────────────────────── */}
          {draft.sectionOrder.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-gray-300 text-gray-400 hover:text-orange-500 hover:border-orange-300 bg-white h-11 transition-colors"
                onClick={addSection}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add section
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Branch logic dialog ────────────────────────────────────────
          Rendered here (outside DnD + motion transforms) so the Radix
          Portal's position:fixed elements center correctly.            */}
      {branchSection && (
        <BranchRuleEditor
          section={branchSection}
          onClose={() => setBranchSection(null)}
        />
      )}
    </>
  )
}
